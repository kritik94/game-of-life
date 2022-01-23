import { map, computed, onMount } from 'nanostores'

function initRandCells(cnt = 100, spread = 25) {
    let res = {}
    for (let i = 0; i < cnt; i++) {
        x = Math.floor(Math.random() * spread * 2) - spread
        y = Math.floor(Math.random() * spread * 2) - spread

        res[`${x}:${y}`] = true
    }

    return res
}

let canvasRef, ctx, cells, settings
let unbinds = []
function init(_canvasRef, _ctx, _cells, _settings) {
    console.log("init")
    canvasRef = _canvasRef || document.getElementById("app")
    ctx = _ctx || canvasRef.getContext("2d")

    cells = _cells || map(initRandCells())
    settings = _settings || map({
        gridSize: 50,
        canvas: {
            x: 0,
            y: 0,
        }
    })
}

function load() {
    unbinds.push(
        onMount(settings, () => {
            const listener = window.addEventListener("resize", resizeCanvas)
            return () => window.removeEventListener("resize", listener)
        })
    )

    const store = computed(
        [settings, cells],
        (settings, cells) => ({settings, cells})
    )
    unbinds.push(
        store.listen(render)
    )
}

document.addEventListener("DOMContentLoaded", () => {
    init()
    load()
    resizeCanvas()
})

if (module.hot) {
    module.hot.dispose(data => {
        data.canvasRef = canvasRef
        data.ctx = ctx
        data.cells = cells
        data.settings = settings

        unbinds.forEach(ub => ub())
        unbinds = []
    })

    module.hot.accept(data => {
        init(data.canvasRef, data.ctx, data.cells, data.settings)
        load()
        resizeCanvas()
    })
}



function resizeCanvas() {
    canvasRef.width = window.innerWidth
    canvasRef.height = window.innerHeight
    document.body.scrollTop = 0

    settings.setKey("canvas", {
        x: window.innerWidth,
        y: window.innerHeight,
    })
}

function render({settings, cells}) {
    console.log("render")

    // render grid
    const {gridSize, canvas: {x, y}} = settings

    const cellWidth = Math.min(Math.floor(x / gridSize), Math.floor(y / gridSize))
    const paddingLeft = (x - Math.floor(x / cellWidth) * cellWidth) / 2
    const paddingTop = (y - Math.floor(y / cellWidth) * cellWidth) / 2
    const gridX = Math.floor(x / cellWidth) + 2
    const gridY = Math.floor(y / cellWidth) + 2

    for (let lineY = paddingTop; lineY <= y; lineY += cellWidth) {
        ctx.beginPath()
        ctx.moveTo(0, lineY)
        ctx.lineTo(x, lineY)
        ctx.stroke()
    }

    for (let lineX = paddingLeft; lineX <= x; lineX += cellWidth) {
        ctx.beginPath()
        ctx.moveTo(lineX, 0)
        ctx.lineTo(lineX, y)
        ctx.stroke()
    }

    // render cells
    Object.keys(cells).forEach(crd => {
        const [x, y] = crd.split(":").map(str => parseInt(str))
        const cellX = (x + Math.floor(gridX / 2)) * cellWidth + paddingLeft
        const cellY = (y + Math.floor(gridY / 2)) * cellWidth + paddingTop

        ctx.fillRect(cellX, cellY, cellWidth, cellWidth)
    })
}
