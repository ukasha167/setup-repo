// Configuration

// The color of the glowing shadow
const Color = "#ffffffff" // White Trail

// The opacity of the "hard" trail body.
// 0.1 gives a subtle ghostly look.
const TrailOpacity = 0.9

// Polling rate for cursor detection (Keep at 500ms)
const CursorUpdatePollingRate = 500

// Shadow / Glow Configuration
const ShadowBlur = 100 // How fuzzy the glow is

// --- PHYSICS CONFIGURATION ---
const TrailLength = 7 // Length of the trail
const SpringStiffness = 0.5 // 0.5 is snappy. Lower (0.2) is lazier.
const SpringDamping = 0.35   // 0.35 is good for 'elastic' snap.

// --- SNAP CONFIGURATION ---
// If distance is greater than this (in pixels), we snap instantly.
// This prevents flying trails when scrolling huge distances.
const SnapThreshold = 800


// -----------------------------------------------------------------------

function createTrail(options) {
    const totalParticles = options?.length || 10
    const particlesColor = options?.color || "#ffffffff"
    const canvas = options?.canvas
    const context = canvas.getContext("2d")

    // Physics state
    let cursor = { x: 0, y: 0 }
    let target = { x: 0, y: 0 }
    let velocity = { x: 0, y: 0 }
    let history = []

    // State to track context switching
    let lastCursorId = null

    let width = 0, height = 0
    let sizeX = options?.size || 10
    let sizeY = options?.sizeY || sizeX * 2.2
    let cursorsInitted = false

    function updateSize(x, y) {
        if (width === x && height === y) return
        width = x
        height = y
        canvas.width = x
        canvas.height = y
    }

    function move(x, y, cursorId) {
        x = x + sizeX / 2
        target.x = x
        target.y = y

        // CHECK: Has the cursor Context changed? (File Switch)
        // OR: Is the distance too massive? (Massive scroll/jump)
        const dist = Math.hypot(x - cursor.x, y - cursor.y)
        const isContextSwitch = (lastCursorId !== null && lastCursorId !== cursorId)
        const isMassiveJump = dist > SnapThreshold

        // Initialize or Snap
        if (!cursorsInitted || isContextSwitch || isMassiveJump) {
            cursorsInitted = true
            lastCursorId = cursorId

            // Hard Snap: Teleport physics head and reset history
            cursor.x = x
            cursor.y = y
            velocity = { x: 0, y: 0 }
            history = []
            for (let i = 0; i < totalParticles; i++) {
                history.push({ x: x, y: y })
            }
        }

        // Update ID for next frame
        lastCursorId = cursorId
    }

    function updateParticles() {
        if (!cursorsInitted) return

        context.clearRect(0, 0, width, height)

        // --- Physics Calculation ---
        let dx = target.x - cursor.x
        let dy = target.y - cursor.y

        velocity.x += dx * SpringStiffness
        velocity.y += dy * SpringStiffness

        velocity.x *= SpringDamping
        velocity.y *= SpringDamping

        cursor.x += velocity.x
        cursor.y += velocity.y

        // Manage History
        history.unshift({ x: cursor.x, y: cursor.y })
        if (history.length > totalParticles) {
            history.pop()
        }

        // --- Rendering ---
        if (history.length === 0) return;

        context.beginPath()
        context.fillStyle = particlesColor
        context.shadowColor = particlesColor;
        context.shadowBlur = ShadowBlur;
        context.globalAlpha = TrailOpacity;

        // Draw Ribbon
        context.moveTo(history[0].x, history[0].y);
        for (let i = 0; i < history.length; i++) {
            context.lineTo(history[i].x, history[i].y);
        }
        for (let i = history.length - 1; i >= 0; i--) {
            context.lineTo(history[i].x, history[i].y + sizeY);
        }

        context.closePath()
        context.fill()

        context.globalAlpha = 1.0;
    }

    function updateCursorSize(newSize, newSizeY) {
        if (newSize > 2) sizeX = newSize
        if (newSizeY) sizeY = newSizeY
    }

    return {
        updateParticles,
        move,
        updateSize,
        updateCursorSize
    }
}

async function createCursorHandler(handlerFunctions) {
    let editor
    while (!editor) {
        await new Promise(resolve => setTimeout(resolve, 100))
        editor = document.querySelector(".part.editor")
    }
    handlerFunctions?.onStarted(editor)

    let updateHandlers = []
    let cursorIdCounter = 0 // Internal ID counter
    let lastObjects = {}

    function createCursorUpdateHandler(target, cursorId) {
        let lastX, lastY
        let update = (editorX, editorY) => {
            if (!lastObjects[cursorId]) {
                const idx = updateHandlers.indexOf(update)
                if (idx > -1) updateHandlers.splice(idx, 1)
                return
            }

            const rect = target.getBoundingClientRect()
            const revX = rect.left - editorX
            const revY = rect.top - editorY

            // Optimize: Skip if position hasn't changed
            if (revX === lastX && revY === lastY) return
            lastX = revX; lastY = revY

            if (revX < 0 || revY < 0 || target.style.visibility === "hidden") return

            // Pass the cursorId to the handler to detect switches
            handlerFunctions?.onCursorPositionUpdated(revX, revY, cursorId)
            handlerFunctions?.onCursorSizeUpdated(target.clientWidth, target.clientHeight)
        }
        updateHandlers.push(update)
    }

    setInterval(() => {
        const now = []
        const cursorElements = editor.getElementsByClassName("cursor")

        for (const target of cursorElements) {
            if (target.hasAttribute("cursorId")) {
                now.push(+target.getAttribute("cursorId"))
                continue
            }
            const thisCursorId = cursorIdCounter++
            now.push(thisCursorId)
            lastObjects[thisCursorId] = target
            target.setAttribute("cursorId", thisCursorId)
            createCursorUpdateHandler(target, thisCursorId)
        }

        for (const id in lastObjects) {
            if (!now.includes(+id)) delete lastObjects[+id]
        }
    }, handlerFunctions?.cursorUpdatePollingRate || 500)

    function updateLoop() {
        const rect = editor.getBoundingClientRect()
        for (const handler of updateHandlers) handler(rect.left, rect.top)
        handlerFunctions?.onLoop()
        requestAnimationFrame(updateLoop)
    }

    // Debounced Resize Observer
    let resizeTimeout
    function updateEditorSize() {
        if (resizeTimeout) clearTimeout(resizeTimeout)
        resizeTimeout = setTimeout(() => {
            handlerFunctions?.onEditorSizeUpdated(editor.clientWidth, editor.clientHeight)
        }, 50)
    }
    new ResizeObserver(updateEditorSize).observe(editor)
    updateEditorSize()

    updateLoop()
}

// Main Initialization
let cursorCanvas, rainbowCursorHandle
createCursorHandler({

    cursorUpdatePollingRate: CursorUpdatePollingRate,

    onStarted: (editor) => {
        cursorCanvas = document.createElement("canvas")
        cursorCanvas.style.pointerEvents = "none"
        cursorCanvas.style.position = "absolute"
        cursorCanvas.style.top = "0px"
        cursorCanvas.style.left = "0px"
        cursorCanvas.style.zIndex = "0"
        editor.appendChild(cursorCanvas)

        rainbowCursorHandle = createTrail({
            length: TrailLength,
            color: Color,
            size: 10,
            canvas: cursorCanvas
        })
    },

    // Added cursorId here
    onCursorPositionUpdated: (x, y, cursorId) => {
        rainbowCursorHandle.move(x, y, cursorId)
    },

    onEditorSizeUpdated: (x, y) => {
        rainbowCursorHandle.updateSize(x, y)
    },

    onCursorSizeUpdated: (x, y) => {
        rainbowCursorHandle.updateCursorSize(x, y)
    },

    onLoop: () => {
        rainbowCursorHandle.updateParticles()
    },
})
