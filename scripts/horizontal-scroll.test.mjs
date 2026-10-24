import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
after(() => server.close());
const { bindHorizontalScroll } = await server.ssrLoadModule('/src/utils/horizontalScroll.ts');

function fixture() {
  const view = new EventTarget();
  const el = new EventTarget();
  const classes = new Set();
  let captured = null;
  Object.assign(el, {
    ownerDocument: { defaultView: view }, scrollWidth: 1200, clientWidth: 400,
    scrollLeft: 200, clientHeight: 300, clientTop: 0,
    getBoundingClientRect: () => ({ top: 0 }), closest: () => null,
    classList: { add: x => classes.add(x), remove: x => classes.delete(x) },
    setPointerCapture: id => { captured = id; },
    hasPointerCapture: id => captured === id,
    releasePointerCapture: () => { captured = null; },
  });
  const cleanup = bindHorizontalScroll(el);
  const fire = (target, type, props = {}) => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { pointerType: 'mouse', pointerId: 1, button: 0, clientX: 200, clientY: 100, deltaX: 0, deltaY: 0, deltaMode: 0, shiftKey: false, ctrlKey: false, detail: 1 }, props);
    target.dispatchEvent(event);
    return event;
  };
  return { el, view, classes, fire, cleanup, captured: () => captured };
}

test('vertical wheel, native horizontal momentum and pinch zoom remain native', () => {
  const f = fixture();
  for (const props of [{ deltaY: 80 }, { deltaY: -80 }, { deltaX: 3, deltaY: 1 }, { deltaX: 50, shiftKey: true }, { deltaY: 30, shiftKey: true, ctrlKey: true }]) {
    assert.equal(f.fire(f.el, 'wheel', props).defaultPrevented, false);
    assert.equal(f.el.scrollLeft, 200);
  }
  f.cleanup();
});

test('Shift+wheel handles small deltas, line/page units and boundaries', () => {
  const f = fixture();
  assert.equal(f.fire(f.el, 'wheel', { deltaY: 2, shiftKey: true }).defaultPrevented, true);
  assert.equal(f.el.scrollLeft, 202);
  f.fire(f.el, 'wheel', { deltaY: 2, deltaMode: 1, shiftKey: true });
  assert.equal(f.el.scrollLeft, 234);
  f.fire(f.el, 'wheel', { deltaY: 1, deltaMode: 2, shiftKey: true });
  assert.equal(f.el.scrollLeft, 634);
  f.fire(f.el, 'wheel', { deltaY: 1000, shiftKey: true });
  assert.equal(f.el.scrollLeft, 800);
  assert.equal(f.fire(f.el, 'wheel', { deltaY: 100, shiftKey: true }).defaultPrevented, false);
  f.cleanup();
});

test('ordinary clicks retain their link target without pointer capture', () => {
  const f = fixture();
  f.fire(f.el, 'pointerdown');
  f.fire(f.view, 'pointermove', { clientX: 203 });
  assert.equal(f.captured(), null);
  f.fire(f.view, 'pointerup');
  assert.equal(f.fire(f.el, 'click').defaultPrevented, false);
  assert.equal(f.el.scrollLeft, 200);
  f.cleanup();
});

test('mouse dragging moves the row, blocks native image drag and suppresses accidental navigation', () => {
  const f = fixture();
  f.fire(f.el, 'pointerdown');
  assert.equal(f.fire(f.el, 'dragstart').defaultPrevented, true);
  f.fire(f.view, 'pointermove', { clientX: 140 });
  assert.equal(f.el.scrollLeft, 260);
  assert.equal(f.captured(), 1);
  assert.ok(f.classes.has('is-dragging'));
  f.fire(f.view, 'pointerup');
  assert.equal(f.captured(), null);
  assert.equal(f.classes.has('is-dragging'), false);
  assert.equal(f.fire(f.el, 'click').defaultPrevented, true);
  f.fire(f.el, 'pointerdown');
  f.fire(f.view, 'pointerup');
  assert.equal(f.fire(f.el, 'click').defaultPrevented, false);
  f.cleanup();
});

test('touch swipes stay native and do not capture pointers or cancel clicks', () => {
  const f = fixture();
  f.fire(f.el, 'pointerdown', { pointerType: 'touch' });
  assert.equal(f.fire(f.view, 'pointermove', { pointerType: 'touch', clientX: 100 }).defaultPrevented, false);
  assert.equal(f.captured(), null);
  assert.equal(f.el.scrollLeft, 200);
  f.cleanup();
});

test('buttons and native scrollbar gutter do not start a card drag', () => {
  const f = fixture();
  f.el.closest = () => ({});
  f.fire(f.el, 'pointerdown');
  f.fire(f.view, 'pointermove', { clientX: 100 });
  assert.equal(f.el.scrollLeft, 200);
  f.el.closest = () => null;
  f.fire(f.el, 'pointerdown', { clientY: 302 });
  f.fire(f.view, 'pointermove', { clientX: 100 });
  assert.equal(f.el.scrollLeft, 200);
  f.cleanup();
});

test('canceling or unmounting releases dragging and removes listeners', () => {
  const f = fixture();
  f.fire(f.el, 'pointerdown');
  f.fire(f.view, 'pointermove', { clientX: 180 });
  f.fire(f.view, 'pointercancel');
  assert.equal(f.captured(), null);
  assert.equal(f.classes.size, 0);
  f.cleanup();
  f.fire(f.el, 'wheel', { deltaY: 100, shiftKey: true });
  f.fire(f.el, 'pointerdown');
  f.fire(f.view, 'pointermove', { clientX: 100 });
  assert.equal(f.el.scrollLeft, 220);
});
