import { EventEmitter } from 'eventemitter3';
import instances from './instances.js';
import logger from './logger.js';
import type Quill from './quill.js';

const debug = logger('quill:events');
const EVENTS = ['selectionchange', 'mousedown', 'mouseup', 'click'] as const;

let lastInstance: Quill | undefined | null;
let currentInstance: Quill | undefined | null;

EVENTS.forEach((eventName) => {
  document.addEventListener(eventName, function (...args) {
    const [event] = args;

    const hasInstances = lastInstance || currentInstance;
    if (eventName === 'selectionchange' && !hasInstances) {
      return;
    }
    if (eventName !== 'selectionchange' && event.target) {
      const node = (event.target as HTMLElement)?.closest?.('.ql-container');
      const newInstance = node && instances.get(node);
      if (newInstance) {
        if (newInstance !== currentInstance) {
          lastInstance = currentInstance;
        }
        currentInstance = newInstance;
      }
    }

    if (lastInstance && lastInstance.emitter) {
      lastInstance.emitter.handleDOM(...args);
    }
    if (currentInstance && currentInstance.emitter) {
      currentInstance.emitter.handleDOM(...args);
    }
  });
});

class Emitter extends EventEmitter<string> {
  static events = {
    DESTROY: 'destroy',
    EDITOR_CHANGE: 'editor-change',
    SCROLL_BEFORE_UPDATE: 'scroll-before-update',
    SCROLL_BLOT_MOUNT: 'scroll-blot-mount',
    SCROLL_BLOT_UNMOUNT: 'scroll-blot-unmount',
    SCROLL_OPTIMIZE: 'scroll-optimize',
    SCROLL_UPDATE: 'scroll-update',
    SCROLL_EMBED_UPDATE: 'scroll-embed-update',
    SELECTION_CHANGE: 'selection-change',
    TEXT_CHANGE: 'text-change',
    COMPOSITION_BEFORE_START: 'composition-before-start',
    COMPOSITION_START: 'composition-start',
    COMPOSITION_BEFORE_END: 'composition-before-end',
    COMPOSITION_END: 'composition-end',
  } as const;

  static sources = {
    API: 'api',
    SILENT: 'silent',
    USER: 'user',
  } as const;

  protected domListeners: Record<string, { node: Node; handler: Function }[]>;

  constructor() {
    super();
    this.domListeners = {};
    this.on('error', debug.error);
  }

  emit(...args: unknown[]): boolean {
    debug.log.call(debug, ...args);
    // @ts-expect-error
    return super.emit(...args);
  }

  handleDOM(event: Event, ...args: unknown[]) {
    (this.domListeners[event.type] || []).forEach(({ handler }) => {
      handler(event, ...args);
    });
  }

  listenDOM(eventName: string, node: Node, handler: EventListener) {
    if (!this.domListeners[eventName]) {
      this.domListeners[eventName] = [];
    }
    this.domListeners[eventName].push({ node, handler });
  }
}

export type EmitterSource =
  (typeof Emitter.sources)[keyof typeof Emitter.sources];

export default Emitter;
