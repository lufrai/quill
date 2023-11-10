import type Quill from '../core';
import Emitter from '../core/emitter';
import type { Bounds } from '../core/selection';
import {
  computePosition,
  autoUpdate,
  inline,
  offset,
  shift,
  flip,
} from '@floating-ui/dom';

const wrappers: Record<string, HTMLDivElement> = {};
const getWrapper = function (theme: string) {
  if (wrappers[theme]) {
    return wrappers[theme];
  }

  const wrapper = document.createElement('div');
  wrapper.classList.add('ql-tooltips');
  wrapper.classList.add(theme);
  document.body.append(wrapper);
  wrappers[theme] = wrapper;

  return wrapper;
};

class Tooltip {
  quill: Quill;
  boundsContainer: HTMLElement;
  root: HTMLDivElement;
  wrapper: HTMLDivElement;
  cancelUpdate?: () => void;
  showing: boolean = false;

  constructor(quill: Quill, boundsContainer?: HTMLElement) {
    this.quill = quill;
    this.boundsContainer = boundsContainer || document.body;
    this.root = document.createElement('div');
    this.root.classList.add('ql-tooltip');
    // @ts-expect-error
    this.root.innerHTML = this.constructor.TEMPLATE;
    this.wrapper = getWrapper(this.quill.theme.name);
    this.showing = true;
    this.hide();

    this.quill.emitter.once(Emitter.events.DESTROY, () => {
      this.hide();
    });
  }

  hide() {
    if (this.cancelUpdate) {
      this.cancelUpdate();
    }
    if (!this.showing) {
      return;
    }
    this.showing = false;
    this.root.classList.add('ql-hidden');
    this.root.remove();
  }

  position(reference: Bounds) {
    // Making the linter happy
    reference;

    if (this.cancelUpdate) {
      this.cancelUpdate();
    }

    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    if (selection.rangeCount < 1) {
      return;
    }

    const range = selection.getRangeAt(0);

    const element = {
      getBoundingClientRect: () => range!.getBoundingClientRect(),
      getClientRects: () => range!.getClientRects(),
    };

    const blot = this.quill.getLeaf(this.quill.getSelection()!.index);
    const node = blot[0]!.domNode;

    const cancel = autoUpdate(node.parentElement!, this.root, () => {
      computePosition(element, this.root, {
        placement: 'bottom',
        middleware: [
          inline(),
          offset(10),
          flip({
            fallbackPlacements: ['top'],
          }),
          shift(),
        ],
      }).then(({ x, y, placement }) => {
        Object.assign(this.root.style, {
          left: `${x}px`,
          top: `${y}px`,
        });
        if (placement === 'top') {
          this.root.classList.add('ql-flip');
        } else {
          this.root.classList.remove('ql-flip');
        }
      });
    });
    this.cancelUpdate = function () {
      cancel();
      delete this.cancelUpdate;
    };

    return 0;
  }

  show() {
    if (this.showing) {
      return;
    }
    this.showing = true;
    this.root.classList.remove('ql-hidden');
    this.root.classList.remove('ql-editing');
    this.wrapper.append(this.root);
  }
}

export default Tooltip;
