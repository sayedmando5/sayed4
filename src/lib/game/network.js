// ============================================================================
//  NETWORK — PeerJS (WebRTC) room system
//  A tiny mesh of two peers over a DataChannel. HOST is authoritative and
//  broadcasts a snapshot; the GUEST sends only its input. No backend needed —
//  PeerJS' free cloud signaling server handles connection establishment.
//  Room code = the host's custom peer id.
// ============================================================================
import Peer from 'peerjs';

// Short, easy-to-type numeric room codes (e.g. "4179"). 4 digits are enough to
// avoid collisions while staying trivially memorable on a phone.
function makeCode() {
  let s = '';
  for (let i = 0; i < 4; i++) s += Math.floor(Math.random() * 10);
  return s;
}

export class Network {
  constructor({ role, character, onState, onData, onError }) {
    this.role = role;              // 'host' | 'guest'
    this.character = character;    // 'sayed' | 'yasmin' (the local player)
    this.onState = onState || (() => {});
    this.onData = onData || (() => {});
    this.onError = onError || (() => {});
    this.peer = null;
    this.conn = null;
    this.connected = false;
    this.pending = [];
  }

  // If we are the host, broadcast to the guest.
  _send(type, payload) {
    if (!this.conn || this.conn.open === false) return;
    try { this.conn.send({ type, ...payload }); } catch (e) { /* ignore */ }
  }

  // If we are the guest, we can't broadcast; we only send to the host.
  _sendToHost(type, payload) {
    if (!this.conn || this.conn.open === false) return;
    try { this.conn.send({ type, ...payload }); } catch (e) { /* ignore */ }
  }

  // ---- HOST: create a room ------------------------------------------------
  createRoom() {
    const code = makeCode();
    this.roomCode = code;
    this.peer = new Peer(code, { debug: 1 });
    this._wireHost(code);
    return code;
  }

  _wireHost(code) {
    const me = this;
    this.peer.on('open', () => {
      this.onState({ stage: 'waiting', code });
    });
    this.peer.on('connection', (conn) => {
      this.conn = conn;
      conn.on('open', () => {
        this.connected = true;
        // tell the guest which character the host controls
        this.conn.send({ type: 'hello', hostChar: me.character });
        this.onState({ stage: 'connected', code, host: me.character });
      });
      conn.on('data', (data) => this.onData(data));
      conn.on('close', () => this._dropGuest());
      conn.on('error', () => this._dropGuest());
    });
    this.peer.on('error', (err) => this.onError(err));
  }

  _dropGuest() {
    this.connected = false;
    this.onState({ stage: 'dropped' });
  }

  // ---- GUEST: join a room ------------------------------------------------
  joinRoom(code) {
    this.roomCode = code;
    this.peer = new Peer({ debug: 1 });
    const me = this;
    this.peer.on('open', () => {
      const conn = me.peer.connect(code, { reliable: true });
      me.conn = conn;
      conn.on('open', () => {
        me.connected = true;
        // announce our character
        conn.send({ type: 'join', guestChar: me.character });
        me.onState({ stage: 'connecting' });
      });
      conn.on('data', (data) => {
        // First real data from the host = the link is live → run the game.
        if (data && data.type === 'hello') me.onState({ stage: 'connected', code: me.roomCode });
        me.onData(data);
      });
      conn.on('close', () => me.onState({ stage: 'dropped' }));
      conn.on('error', () => me.onState({ stage: 'dropped' }));
    });
    this.peer.on('error', (err) => this.onError(err));
  }

  // ---- messaging ----------------------------------------------------------
  // Host sends a snapshot to the guest.
  sendSnapshot(snapshot) {
    this._send('snap', { snapshot });
  }

  // Guest sends host its character input.
  sendInput(character, keys) {
    this._sendToHost('input', { character, keys });
  }

  // Guest tells host which character it joined as.
  announceGuest(character) {
    this._sendToHost('join', { guestChar: character });
  }

  // Guest asks the host to retry the current level.
  sendRetry(message) {
    this._sendToHost('retry', { message });
  }

  // Host broadcasts a one-off game event (toast/sfx) so both screens sync.
  broadcastEvent(ev) {
    this._send('event', { event: ev });
  }

  close() {
    try { if (this.conn) this.conn.close(); } catch (e) {}
    try { if (this.peer) this.peer.destroy(); } catch (e) {}
    this.connected = false;
  }
}

export { makeCode };
