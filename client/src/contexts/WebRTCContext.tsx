import React, {
  createContext, useContext, useState, useEffect,
  ReactNode, useCallback, useRef,
} from 'react';
import webRTCManager, { WebRTCEvent, BasePeer as ManagerBasePeer } from '@/lib/webRTCManager';
import { useToast } from '@/hooks/use-toast';
import { generateId } from '@/lib/utils';

export type PeerStatus = "available" | "connecting" | "connected" | "disconnected" | "failed";

export interface UIPeer extends ManagerBasePeer {
  status: PeerStatus;
  isLocal?: boolean;
}

export interface UIFileTransfer {
  id: string;
  fileId: string;
  name: string;
  size: number;
  type: string;
  peerId: string;
  peerName: string;
  status: "pending" | "transferring" | "paused" | "completed" | "error" | "rejected" | "waiting_acceptance";
  progress: number;
  direction: 'send' | 'receive';
  file?: File;
  blob?: Blob;
  timestamp: number;
}

interface WebRTCContextType {
  connectSignaling: (name: string) => void;
  disconnectSignaling: () => void;
  disconnectPeer: (peerId: string) => void;
  requestPeerList: () => void;
  isSignalingConnected: boolean;
  localPeer: UIPeer | null;
  peers: UIPeer[];
  initiateConnection: (peerId: string) => void;
  sendFile: (peerId: string, file: File) => string;
  acceptFileOffer: (uiTransferId: string) => void;
  rejectFileOffer: (uiTransferId: string) => void;
  activeTransfers: UIFileTransfer[];
  getTransferById: (uiTransferId: string) => UIFileTransfer | undefined;
}

const WebRTCContext = createContext<WebRTCContextType | undefined>(undefined);

export const WebRTCProvider = ({ children }: { children: ReactNode }) => {
  const [isSignalingConnected, setIsSignalingConnected] = useState(false);
  const [localPeer, setLocalPeer] = useState<UIPeer | null>(null);
  const [peers, setPeers] = useState<UIPeer[]>([]);
  const [activeTransfers, setActiveTransfers] = useState<UIFileTransfer[]>([]);
  const { toast } = useToast();

  const peersRef = useRef<UIPeer[]>(peers);
  const activeTransfersRef = useRef<UIFileTransfer[]>(activeTransfers);
  const localPeerRef = useRef<UIPeer | null>(localPeer);

  useEffect(() => { peersRef.current = peers; }, [peers]);
  useEffect(() => { activeTransfersRef.current = activeTransfers; }, [activeTransfers]);
  useEffect(() => { localPeerRef.current = localPeer; }, [localPeer]);

  const updatePeer = useCallback((peerData: ManagerBasePeer, status: PeerStatus) => {
    setPeers(prev => {
      const idx = prev.findIndex(p => p.id === peerData.id);
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], name: peerData.name, status };
        return updated;
      }
      return [...prev, { ...peerData, status }];
    });
  }, []);

  const updateTransfer = useCallback((id: string, updates: Partial<UIFileTransfer>) => {
    setActiveTransfers(prev =>
      prev.map(t => (t.id === id || t.fileId === id) ? { ...t, ...updates, timestamp: Date.now() } : t)
    );
  }, []);

  const findTransferByFileId = useCallback((fileId: string, peerId?: string, direction?: 'send' | 'receive') => {
    return activeTransfersRef.current.find(t =>
      t.fileId === fileId &&
      (peerId ? t.peerId === peerId : true) &&
      (direction ? t.direction === direction : true)
    );
  }, []);

  const disconnectPeer = useCallback((peerId: string) => {
    webRTCManager.cleanupPeerConnection(peerId);
  }, []);

  useEffect(() => {
    const handleEvent = (event: WebRTCEvent) => {
      switch (event.type) {
        case 'signalingConnected':
          setIsSignalingConnected(true);
          break;

        case 'signalingDisconnected':
          setIsSignalingConnected(false);
          setLocalPeer(null);
          setPeers([]);
          setActiveTransfers(prev => prev.map(t =>
            ['transferring', 'pending', 'waiting_acceptance'].includes(t.status)
              ? { ...t, status: 'error', progress: 0, timestamp: Date.now() }
              : t
          ));
          break;

        case 'signalingError':
          toast({ title: "Signaling Error", description: String(event.payload), variant: "destructive" });
          setIsSignalingConnected(false);
          break;

        case 'localIdAssigned': {
          const p = event.payload as ManagerBasePeer;
          setLocalPeer({ ...p, status: 'available', isLocal: true });
          break;
        }

        case 'peerListUpdated': {
          const serverList = (event.payload as ManagerBasePeer[]).filter(p => p.id !== localPeerRef.current?.id);
          setPeers(prevPeers => {
            const serverMap = new Map(serverList.map(p => [p.id, p]));
            const next: UIPeer[] = [];
            serverList.forEach(sp => {
              const existing = prevPeers.find(p => p.id === sp.id);
              if (existing) {
                next.push({
                  ...existing, name: sp.name,
                  status: ['connecting', 'connected'].includes(existing.status) ? existing.status : 'available',
                });
              } else {
                next.push({ ...sp, status: 'available' });
              }
            });
            prevPeers.forEach(pp => {
              if (['connected', 'connecting'].includes(pp.status) && !serverMap.has(pp.id)) {
                if (!next.find(p => p.id === pp.id)) next.push(pp);
              }
            });
            return next;
          });
          break;
        }

        case 'newPeerArrived': {
          const np = event.payload as ManagerBasePeer;
          if (localPeerRef.current && np.id !== localPeerRef.current.id) updatePeer(np, 'available');
          break;
        }

        case 'peerLeft': {
          const { peerId } = event.payload as { peerId: string };
          setPeers(prev => prev.filter(p => p.id !== peerId));
          setActiveTransfers(prev => prev.map(t =>
            t.peerId === peerId && ['transferring', 'pending', 'waiting_acceptance'].includes(t.status)
              ? { ...t, status: 'error', timestamp: Date.now() }
              : t
          ));
          break;
        }

        case 'rtcConnectionStateChange': {
          const { peerId, state } = event.payload as { peerId: string; state: RTCIceConnectionState };
          const p = peersRef.current.find(x => x.id === peerId);
          const name = p?.name ?? 'Unknown Peer';
          if (state === 'connected') {
            updatePeer({ id: peerId, name }, 'connected');
          } else if (['disconnected', 'failed', 'closed'].includes(state)) {
            updatePeer({ id: peerId, name }, 'disconnected');
            setActiveTransfers(prev => prev.map(t =>
              t.peerId === peerId && ['transferring', 'pending', 'waiting_acceptance'].includes(t.status)
                ? { ...t, status: 'error', timestamp: Date.now() }
                : t
            ));
          } else if (['new', 'checking'].includes(state)) {
            if (p) updatePeer({ id: peerId, name }, 'connecting');
            else setPeers(prev => [...prev, { id: peerId, name, status: 'connecting' }]);
          }
          break;
        }

        case 'dataChannelOpen': {
          const { peerId } = event.payload as { peerId: string };
          const p = peersRef.current.find(x => x.id === peerId);
          updatePeer({ id: peerId, name: p?.name ?? 'Peer' }, 'connected');
          toast({ title: "Peer Connected", description: `Ready to share with ${p?.name ?? 'Peer'}.` });
          break;
        }

        case 'dataChannelClose': {
          const { peerId } = event.payload as { peerId: string };
          const p = peersRef.current.find(x => x.id === peerId);
          setActiveTransfers(prev => prev.map(t =>
            t.peerId === peerId && ['transferring', 'pending', 'waiting_acceptance'].includes(t.status)
              ? { ...t, status: 'error', progress: 0, timestamp: Date.now() }
              : t
          ));
          updatePeer({ id: peerId, name: p?.name ?? 'Peer' }, 'disconnected');
          toast({ title: "Data Channel Closed", description: `Connection to ${p?.name ?? 'Peer'} lost.`, variant: "destructive" });
          break;
        }

        case 'fileOffered': {
          const offer = event.payload as { id: string; name: string; size: number; type: string; senderId: string; senderName: string };
          const exists = activeTransfersRef.current.find(t => t.fileId === offer.id && t.peerId === offer.senderId && t.direction === 'receive');
          if (!exists) {
            const t: UIFileTransfer = {
              id: offer.id, fileId: offer.id,
              name: offer.name, size: offer.size, type: offer.type,
              peerId: offer.senderId, peerName: offer.senderName,
              status: 'waiting_acceptance', progress: 0, direction: 'receive', timestamp: Date.now(),
            };
            setActiveTransfers(prev => [...prev, t]);
            toast({ title: "Incoming File", description: `${offer.senderName} wants to send ${offer.name}` });
          }
          break;
        }

        case 'fileAccepted':
          updateTransfer(event.payload.fileId, { status: 'transferring', timestamp: Date.now() });
          break;

        case 'fileRejected':
          updateTransfer(event.payload.fileId, { status: 'rejected', progress: 0, timestamp: Date.now() });
          toast({ title: "Transfer Rejected", description: "Peer rejected the file.", variant: "destructive" });
          break;

        case 'fileProgress': {
          const { fileId, peerId, progress, direction } = event.payload as { fileId: string; peerId: string; progress: number; direction: 'send' | 'receive' };
          if (progress === -1) {
            const cur = findTransferByFileId(fileId, peerId, direction);
            updateTransfer(fileId, { status: 'error', progress: cur?.progress ?? 0, timestamp: Date.now() });
          } else {
            const cur = activeTransfersRef.current.find(t => t.fileId === fileId);
            updateTransfer(fileId, {
              progress,
              status: progress < 100 ? 'transferring' : (cur?.status ?? 'transferring'),
              timestamp: Date.now(),
            });
          }
          break;
        }

        case 'fileSendComplete': {
          const { fileId, name } = event.payload as { fileId: string; peerId: string; name: string };
          updateTransfer(fileId, { status: 'completed', progress: 100, timestamp: Date.now() });
          toast({ title: "File Sent", description: `${name} sent successfully.` });
          break;
        }

        case 'fileReceiveComplete': {
          const { fileId, name, blob } = event.payload as { fileId: string; peerId: string; name: string; blob: Blob; type: string };
          updateTransfer(fileId, { status: 'completed', progress: 100, blob, timestamp: Date.now() });
          toast({ title: "File Received", description: `${name} received. Ready to save.` });
          break;
        }

        case 'peerNameChanged': {
          const { peerId, name } = event.payload as { peerId: string; name: string };
          setPeers(prev => prev.map(p => p.id === peerId ? { ...p, name } : p));
          setActiveTransfers(prev => prev.map(t => t.peerId === peerId ? { ...t, peerName: name } : t));
          if (localPeerRef.current?.id === peerId) setLocalPeer(prev => prev ? { ...prev, name } : null);
          break;
        }
      }
    };

    webRTCManager.addListener(handleEvent);
    return () => webRTCManager.removeListener(handleEvent);
  }, [toast, updatePeer, updateTransfer, findTransferByFileId]);

  // Stall timeout watchdog
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const STALLED = 60000;
      let changed = false;
      const next = activeTransfersRef.current.map(t => {
        if (['transferring', 'pending', 'waiting_acceptance'].includes(t.status) && now - t.timestamp > STALLED) {
          changed = true;
          return { ...t, status: 'error' as UIFileTransfer['status'] };
        }
        return t;
      });
      if (changed) setActiveTransfers(next);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const connectSignaling = useCallback((name: string) => {
    const saved = JSON.parse(localStorage.getItem('Pear-settings') ?? '{}');
    const displayName = name || saved.displayName || `User-${generateId().substring(0, 4)}`;
    webRTCManager.connectSignaling(displayName);
  }, []);

  const disconnectSignaling = useCallback(() => {
    webRTCManager.disconnectSignaling();
  }, []);

  const initiateConnection = useCallback((peerId: string) => {
    const peer = peersRef.current.find(p => p.id === peerId);
    if (peer) {
      updatePeer(peer, 'connecting');
      webRTCManager.initiateConnection(peerId, peer.name);
    } else {
      toast({ title: "Connection Failed", description: `Peer ${peerId} not found.`, variant: "destructive" });
    }
  }, [updatePeer, toast]);

  const sendFile = useCallback((peerId: string, file: File): string => {
    const uiId = generateId();
    const fileId = generateId();
    const peer = peersRef.current.find(p => p.id === peerId);
    if (!peer) {
      toast({ title: "Error Sending File", description: "Peer not found.", variant: "destructive" });
      return uiId;
    }
    const t: UIFileTransfer = {
      id: uiId, fileId, name: file.name, size: file.size, type: file.type,
      peerId, peerName: peer.name, status: 'pending', progress: 0,
      direction: 'send', file, timestamp: Date.now(),
    };
    setActiveTransfers(prev => [...prev, t]);
    webRTCManager.queueFileForSend(peerId, file, fileId);
    return uiId;
  }, [toast]);

  const acceptFileOffer = useCallback((uiTransferId: string) => {
    const t = activeTransfersRef.current.find(x => x.id === uiTransferId && x.direction === 'receive');
    if (t) {
      webRTCManager.acceptFileOffer(t.peerId, t.fileId);
      updateTransfer(t.id, { status: 'transferring', timestamp: Date.now() });
    }
  }, [updateTransfer]);

  const rejectFileOffer = useCallback((uiTransferId: string) => {
    const t = activeTransfersRef.current.find(x => x.id === uiTransferId && x.direction === 'receive');
    if (t) {
      webRTCManager.rejectFileOffer(t.peerId, t.fileId);
      updateTransfer(t.id, { status: 'rejected', timestamp: Date.now() });
    }
  }, [updateTransfer]);

  const getTransferById = useCallback((id: string) => {
    return activeTransfersRef.current.find(t => t.id === id);
  }, []);

  const requestPeerList = useCallback(() => webRTCManager.requestPeerList(), []);

  return (
    <WebRTCContext.Provider value={{
      connectSignaling, disconnectSignaling, disconnectPeer, requestPeerList,
      isSignalingConnected, localPeer, peers,
      initiateConnection, sendFile, acceptFileOffer, rejectFileOffer,
      activeTransfers, getTransferById,
    }}>
      {children}
    </WebRTCContext.Provider>
  );
};

export const useWebRTC = (): WebRTCContextType => {
  const ctx = useContext(WebRTCContext);
  if (!ctx) throw new Error('useWebRTC must be used within a WebRTCProvider');
  return ctx;
};
