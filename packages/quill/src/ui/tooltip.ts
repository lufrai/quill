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

const isScrollable = (el: Element) => {
  const { overflowY } = getComputedStyle(el, null);
  return overflowY !== 'visible' && overflowY !== 'clip';
};

const wrappers: Record<string, HTMLElement> = {};
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
  cancelUpdate?: () => void;

  constructor(quill: Quill, boundsContainer?: HTMLElement) {
    this.quill = quill;
    this.boundsContainer = boundsContainer || document.body;
    this.root = document.createElement('div');
    this.root.classList.add('ql-tooltip');
    // @ts-expect-error
    this.root.innerHTML = this.constructor.TEMPLATE;
    if (isScrollable(this.quill.root)) {
      this.quill.root.addEventListener('scroll', () => {
        this.root.style.marginTop = `${-1 * this.quill.root.scrollTop}px`;
      });
    }

    const wrapper = getWrapper(this.quill.theme.name);
    wrapper.append(this.root);
    this.hide();

    this.quill.emitter.once(Emitter.events.DESTROY, () => {
      this.hide();
      this.root.remove();
    });
  }

  hide() {
    if (this.cancelUpdate) {
      this.cancelUpdate();
    }
    this.root.classList.add('ql-hidden');
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

    this.cancelUpdate = autoUpdate(node.parentElement!, this.root, () => {
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
          top: `${y + this.quill.root.scrollTop}px`,
        });
        if (placement === 'top') {
          this.root.classList.add('ql-flip');
        } else {
          this.root.classList.remove('ql-flip');
        }
      });
    });

    return 0;
  }

  show() {
    this.root.classList.remove('ql-editing');
    this.root.classList.remove('ql-hidden');
  }
}

export default Tooltip;
