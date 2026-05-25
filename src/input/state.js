const input = {
    draggingCamera: false,
    draggingAim: false,
    prevX: 0,
    prevY: 0,
    activePointerId: null,
};

function resetInputState() {
    input.draggingCamera = false;
    input.draggingAim = false;
    input.prevX = 0;
    input.prevY = 0;
    input.activePointerId = null;
}

export { input, resetInputState };
