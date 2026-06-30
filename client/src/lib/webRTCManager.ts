import { toast } from '@/hooks/use-toast';

const STUN_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' },
  ],
};

const CHUNK_SIZE = 128 * 1024;

export interface BasePeer {
  id: string;
  name: string;
}

export interface WebRTCPeerConnection extends BasePeer {
  pc: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
  makingOffer?: boolean;
  isIgnoringOffer?: boolean;
  polite?: boolean;
  filesToSend: Array<{ file: File; id: string; metadataSent: boolean; offset: number }>;
  receivingFileInfo?: {
    id: string; name: string; size: number; type: string;
    receivedBytes: number; chunks: ArrayBuffer[];
    senderId: string; senderName: string;
  };
}

export type WebRTCEventType =
  | 'signalingConnected'
  | 'signalingDisconnected'
  | 'signalingError'
  | 'localIdAssigned'
  | 'peerListUpdated'
  | 'newPeerArrived'
  | 'peerLeft'
  | 'rtcConnectionStateChange'
  | 'dataChannelOpen'
  | 'dataChannelMessage'
  | 'dataChannelClose'
  | 'dataChannelError'
  | 'fileOffered'
  | 'fileAccepted'
  | 'fileRejected'
  | 'fileProgress'
  | 'fileSendComplete'
  | 'fileReceiveComplete'
  | 'peerNameChanged';

export type WebRTCEvent<T = any> = {
  type: WebRTCEventType;
  payload?: T;
};

type EventListener = (event: WebRTCEvent) => void;

class WebRTCManager {
  private ws: WebSocket | null = null;
  private peerConnections = new Map<string, WebRTCPeerConnection>();
  private localId: string | null = null;
  private localName: string = 'Anonymous';
  private listeners: Set<EventListener> = new Set();
  private static instance: WebRTCManager;

  private constructor() {}

  public static getInstance(): WebRTCManager {
    if (!WebRTCManager.instance) {
      WebRTCManager.instance = new WebRTCManager();
    }
    return WebRTCManager.instance;
  }

  public connectSignaling(name: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (this.localName !== name) {
        this.localName = name;
        this.sendSignalingMessage({ type: 'update-name', name: this.localName });
      }
      return;
    }
    if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
      return;
    }

    this.localName = name;

    // Signaling is always via Cloudflare Worker
    // Fall back to the known production worker URL if env var is missing
    const workerUrl = import.meta.env.VITE_CF_WORKER_URL || 'wss://pear.puranjaysharma2k6.workers.dev';
    const signalingUrl = workerUrl.startsWith('ws') ? workerUrl : `wss://${workerUrl}`;
    const url = `${signalingUrl}/?name=${encodeURIComponent(name)}`;

    console.log('[WebRTCManager] Connecting to Cloudflare signaling:', url);

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('[WebRTCManager] Signaling WebSocket connected.');
    };

    this.ws.onerror = (err) => {
      console.error('[WebRTCManager] Signaling WebSocket error:', err);
      this.emitEvent({ type: 'signalingError', payload: 'WebSocket connection error' });
      this.ws = null;
    };

    this.ws.onmessage = async (event) => {
      const message = JSON.parse(event.data as string);
      switch (message.type) {
        case 'registered':
          this.localId = message.peerId;
          this.localName = message.yourName;
          this.emitEvent({ type: 'localIdAssigned', payload: { id: this.localId, name: this.localName } });
          this.emitEvent({ type: 'signalingConnected' });
          this.emitEvent({ type: 'peerListUpdated', payload: message.peers });
          break;
        case 'peer-list':
          this.emitEvent({ type: 'peerListUpdated', payload: message.peers });
          break;
        case 'new-peer':
          this.emitEvent({ type: 'newPeerArrived', payload: message.peer });
          break;
        case 'peer-disconnected':
          this.cleanupPeerConnection(message.peerId);
          this.emitEvent({ type: 'peerLeft', payload: { peerId: message.peerId } });
          break;
        case 'offer':
          await this.handleOffer(message.from, message.name, message.offer);
          break;
        case 'answer':
          await this.handleAnswer(message.from, message.answer);
          break;
        case 'ice-candidate':
          await this.handleIceCandidate(message.from, message.candidate);
          break;
        case 'error':
          console.error('[WebRTCManager] Signaling error:', message.message);
          toast({ title: "Signaling Error", description: message.message, variant: "destructive" });
          this.emitEvent({ type: 'signalingError', payload: message.message });
          break;
        case 'peer-name-updated':
          this.emitEvent({ type: 'peerNameChanged', payload: { peerId: message.peerId, name: message.name } });
          const conn = this.peerConnections.get(message.peerId);
          if (conn) conn.name = message.name;
          break;
        default:
          console.warn('[WebRTCManager] Unknown message type:', message.type);
      }
    };

    this.ws.onclose = (ev) => {
      console.log(`[WebRTCManager] Signaling closed. Code: ${ev.code}`);
      this.emitEvent({ type: 'signalingDisconnected' });
      this.localId = null;
      this.peerConnections.forEach(c => this.cleanupPeerConnection(c.id));
      this.peerConnections.clear();
      this.ws = null;
    };
  }

  public disconnectSignaling() {
    if (this.ws) this.ws.close();
  }

  public isSignalingConnected(): boolean {
    return !!(this.ws?.readyState === WebSocket.OPEN && this.localId !== null);
  }

  public getLocalId = () => this.localId;
  public getLocalName = () => this.localName;

  public requestPeerList() {
    if (this.isSignalingConnected()) {
      this.sendSignalingMessage({ type: 'get-peers' });
    }
  }

  public addListener = (l: EventListener) => this.listeners.add(l);
  public removeListener = (l: EventListener) => this.listeners.delete(l);
  private emitEvent = (event: WebRTCEvent) => this.listeners.forEach(l => l(event));
  private sendSignalingMessage = (msg: any) => {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      console.error('[WebRTCManager] WS not open, cannot send:', msg.type);
    }
  };

  private async createRTCPeerConnection(peerId: string, peerName: string, polite: boolean): Promise<WebRTCPeerConnection> {
    if (this.peerConnections.has(peerId)) return this.peerConnections.get(peerId)!;

    const pc = new RTCPeerConnection(STUN_SERVERS);
    const rtcPeer: WebRTCPeerConnection = { id: peerId, name: peerName, pc, polite, filesToSend: [] };
    this.peerConnections.set(peerId, rtcPeer);

    pc.onicecandidate = (e) => {
      if (e.candidate) this.sendSignalingMessage({ type: 'ice-candidate', to: peerId, candidate: e.candidate });
    };

    pc.oniceconnectionstatechange = () => {
      this.emitEvent({ type: 'rtcConnectionStateChange', payload: { peerId, state: pc.iceConnectionState } });
      if (['disconnected', 'failed', 'closed'].includes(pc.iceConnectionState)) {
        this.cleanupPeerConnection(peerId);
      }
    };

    pc.onnegotiationneeded = async () => {
      if (!rtcPeer.polite || rtcPeer.makingOffer || pc.signalingState !== 'stable') return;
      rtcPeer.makingOffer = true;
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.sendSignalingMessage({ type: 'offer', to: peerId, offer: pc.localDescription });
      } catch (err) {
        console.error('[WebRTCManager] onnegotiationneeded error:', err);
      } finally {
        rtcPeer.makingOffer = false;
      }
    };

    pc.ondatachannel = (e) => {
      rtcPeer.dataChannel = e.channel;
      this.setupDataChannelEvents(rtcPeer);
    };

    return rtcPeer;
  }

  public async initiateConnection(peerId: string, peerName: string) {
    if (!this.localId || this.localId === peerId) return;
    const rtcPeer = await this.createRTCPeerConnection(peerId, peerName, false);
    if (!rtcPeer.dataChannel) {
      const dc = rtcPeer.pc.createDataChannel('fileTransfer', { ordered: true });
      rtcPeer.dataChannel = dc;
      this.setupDataChannelEvents(rtcPeer);
    }
    if (rtcPeer.pc.signalingState === 'stable') {
      rtcPeer.makingOffer = true;
      try {
        const offer = await rtcPeer.pc.createOffer();
        await rtcPeer.pc.setLocalDescription(offer);
        this.sendSignalingMessage({ type: 'offer', to: peerId, offer: rtcPeer.pc.localDescription });
      } catch (err) {
        console.error('[WebRTCManager] initiateConnection error:', err);
        this.cleanupPeerConnection(peerId);
      } finally {
        rtcPeer.makingOffer = false;
      }
    }
  }

  private async handleOffer(fromId: string, fromName: string, offer: RTCSessionDescriptionInit) {
    const rtcPeer = this.peerConnections.get(fromId) || await this.createRTCPeerConnection(fromId, fromName, true);
    const collision = !!(rtcPeer.makingOffer || rtcPeer.pc.signalingState !== 'stable');
    rtcPeer.isIgnoringOffer = !rtcPeer.polite && collision;
    if (rtcPeer.isIgnoringOffer) return;
    try {
      await rtcPeer.pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await rtcPeer.pc.createAnswer();
      await rtcPeer.pc.setLocalDescription(answer);
      this.sendSignalingMessage({ type: 'answer', to: fromId, answer: rtcPeer.pc.localDescription });
    } catch (err) {
      console.error('[WebRTCManager] handleOffer error:', err);
    }
  }

  private async handleAnswer(fromId: string, answer: RTCSessionDescriptionInit) {
    const rtcPeer = this.peerConnections.get(fromId);
    if (!rtcPeer) return;
    try {
      await rtcPeer.pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
      console.error('[WebRTCManager] handleAnswer error:', err);
    }
  }

  private async handleIceCandidate(fromId: string, candidate: RTCIceCandidateInit) {
    const rtcPeer = this.peerConnections.get(fromId);
    if (!rtcPeer || !candidate) return;
    try {
      await rtcPeer.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      // ignore common non-fatal errors
    }
  }

  private setupDataChannelEvents(rtcPeer: WebRTCPeerConnection) {
    const { dataChannel, id: peerId } = rtcPeer;
    if (!dataChannel) return;
    dataChannel.onopen = () => {
      this.emitEvent({ type: 'dataChannelOpen', payload: { peerId } });
      this.sendQueuedFiles(peerId);
    };
    dataChannel.onclose = () => this.emitEvent({ type: 'dataChannelClose', payload: { peerId } });
    dataChannel.onerror = (e) => this.emitEvent({ type: 'dataChannelError', payload: { peerId, error: e } });
    dataChannel.onmessage = (e) => this.handleDataChannelMessage(e, rtcPeer);
  }

  private handleDataChannelMessage(event: MessageEvent, rtcPeer: WebRTCPeerConnection) {
    const { id: peerId, name: peerName } = rtcPeer;
    try {
      if (typeof event.data === 'string') {
        const message = JSON.parse(event.data);
        switch (message.type) {
          case 'file-metadata':
            rtcPeer.receivingFileInfo = {
              ...message.payload, id: message.fileId,
              receivedBytes: 0, chunks: [], senderId: peerId, senderName: peerName,
            };
            this.emitEvent({ type: 'fileOffered', payload: { ...rtcPeer.receivingFileInfo } });
            break;
          case 'file-accept':
            this.emitEvent({ type: 'fileAccepted', payload: { fileId: message.fileId, peerId } });
            if (typeof message.fileId === 'string' && message.fileId.length > 0) {
              this.sendFileChunks(peerId, message.fileId);
            }
            break;
          case 'file-reject':
            this.emitEvent({ type: 'fileRejected', payload: { fileId: message.fileId, peerId } });
            rtcPeer.filesToSend = rtcPeer.filesToSend.filter(f => f.id !== message.fileId);
            break;
          default:
            this.emitEvent({ type: 'dataChannelMessage', payload: { peerId, message } });
        }
      } else if (event.data instanceof ArrayBuffer) {
        if (rtcPeer.receivingFileInfo) {
          const info = rtcPeer.receivingFileInfo;
          info.chunks.push(event.data);
          info.receivedBytes += event.data.byteLength;
          const progress = (info.receivedBytes / info.size) * 100;
          this.emitEvent({ type: 'fileProgress', payload: { fileId: info.id, peerId, progress, direction: 'receive' } });
          if (info.receivedBytes >= info.size) {
            const blob = new Blob(info.chunks, { type: info.type });
            this.emitEvent({ type: 'fileReceiveComplete', payload: { fileId: info.id, peerId, name: info.name, blob, type: info.type } });
            rtcPeer.receivingFileInfo = undefined;
          }
        }
      }
    } catch (err) {
      console.error('[WebRTCManager] handleDataChannelMessage error:', err);
    }
  }

  public queueFileForSend(peerId: string, file: File, fileTransferId: string) {
    const rtcPeer = this.peerConnections.get(peerId);
    if (!rtcPeer) {
      this.emitEvent({ type: 'fileProgress', payload: { fileId: fileTransferId, peerId, progress: -1, direction: 'send' } });
      return;
    }
    rtcPeer.filesToSend.push({ file, id: fileTransferId, metadataSent: false, offset: 0 });
    if (rtcPeer.dataChannel?.readyState === 'open') this.sendQueuedFiles(peerId);
  }

  private sendQueuedFiles(peerId: string) {
    const rtcPeer = this.peerConnections.get(peerId);
    if (!rtcPeer?.dataChannel || rtcPeer.dataChannel.readyState !== 'open') return;
    const fileDetail = rtcPeer.filesToSend.find(f => !f.metadataSent);
    if (fileDetail) {
      try {
        rtcPeer.dataChannel.send(JSON.stringify({
          type: 'file-metadata', fileId: fileDetail.id,
          payload: { name: fileDetail.file.name, size: fileDetail.file.size, type: fileDetail.file.type },
        }));
        fileDetail.metadataSent = true;
      } catch (e) {
        console.error('[WebRTCManager] Error sending metadata:', e);
      }
    }
  }

  public acceptFileOffer(peerId: string, fileId: string) {
    const rtcPeer = this.peerConnections.get(peerId);
    if (rtcPeer?.dataChannel?.readyState === 'open') {
      rtcPeer.dataChannel.send(JSON.stringify({ type: 'file-accept', fileId }));
    }
  }

  public rejectFileOffer(peerId: string, fileId: string) {
    const rtcPeer = this.peerConnections.get(peerId);
    if (rtcPeer?.dataChannel?.readyState === 'open') {
      rtcPeer.dataChannel.send(JSON.stringify({ type: 'file-reject', fileId }));
    }
    if (rtcPeer?.receivingFileInfo?.id === fileId) rtcPeer.receivingFileInfo = undefined;
  }

  private async sendFileChunks(peerId: string, fileTransferId: string) {
    const rtcPeer = this.peerConnections.get(peerId);
    if (!rtcPeer) {
      this.emitEvent({ type: 'fileProgress', payload: { fileId: fileTransferId, peerId, progress: -1, direction: 'send' } });
      return;
    }
    const fileDetail = rtcPeer.filesToSend.find(f => f.id === fileTransferId);
    if (!rtcPeer.dataChannel || rtcPeer.dataChannel.readyState !== 'open' || !fileDetail) {
      this.emitEvent({ type: 'fileProgress', payload: { fileId: fileTransferId, peerId, progress: -1, direction: 'send' } });
      return;
    }

    const { file } = fileDetail;
    const sendChunk = () => {
      if (!rtcPeer.dataChannel || rtcPeer.dataChannel.readyState !== 'open') {
        this.emitEvent({ type: 'fileProgress', payload: { fileId: fileTransferId, peerId, progress: -1, direction: 'send' } });
        return;
      }
      if (fileDetail.offset >= file.size) {
        this.emitEvent({ type: 'fileSendComplete', payload: { fileId: fileTransferId, peerId, name: file.name } });
        rtcPeer.filesToSend = rtcPeer.filesToSend.filter(f => f.id !== fileTransferId);
        this.sendQueuedFiles(peerId);
        return;
      }
      if (rtcPeer.dataChannel.bufferedAmount > CHUNK_SIZE * 10) {
        setTimeout(sendChunk, 50);
        return;
      }
      const chunk = file.slice(fileDetail.offset, Math.min(fileDetail.offset + CHUNK_SIZE, file.size));
      const reader = new FileReader();
      reader.onload = () => {
        if (!(reader.result instanceof ArrayBuffer)) {
          this.emitEvent({ type: 'fileProgress', payload: { fileId: fileTransferId, peerId, progress: -1, direction: 'send' } });
          return;
        }
        if (rtcPeer.dataChannel?.readyState === 'open') {
          try {
            rtcPeer.dataChannel.send(reader.result);
            fileDetail.offset += reader.result.byteLength;
            const progress = (fileDetail.offset / file.size) * 100;
            this.emitEvent({ type: 'fileProgress', payload: { fileId: fileTransferId, peerId, progress, direction: 'send' } });
            requestAnimationFrame(sendChunk);
          } catch (e) {
            this.emitEvent({ type: 'fileProgress', payload: { fileId: fileTransferId, peerId, progress: -1, direction: 'send' } });
          }
        }
      };
      reader.onerror = () => this.emitEvent({ type: 'fileProgress', payload: { fileId: fileTransferId, peerId, progress: -1, direction: 'send' } });
      reader.readAsArrayBuffer(chunk);
    };
    requestAnimationFrame(sendChunk);
  }

  public cleanupPeerConnection(peerId: string) {
    const rtcPeer = this.peerConnections.get(peerId);
    if (rtcPeer) {
      rtcPeer.dataChannel?.close();
      rtcPeer.pc.close();
      this.peerConnections.delete(peerId);
      rtcPeer.filesToSend.forEach(f =>
        this.emitEvent({ type: 'fileProgress', payload: { fileId: f.id, peerId, progress: -1, direction: 'send' } })
      );
      if (rtcPeer.receivingFileInfo) {
        this.emitEvent({ type: 'fileProgress', payload: { fileId: rtcPeer.receivingFileInfo.id, peerId, progress: -1, direction: 'receive' } });
      }
    }
  }

  public getPeerConnection = (peerId: string) => this.peerConnections.get(peerId);
}

export default WebRTCManager.getInstance();
