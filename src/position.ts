type Rect = {
    x: number,
    y: number,
    width: number,
    height: number,
};

interface Pos {
    x: number;
    y: number;
}

let hdir: "r" | "l" = "r";
let vdir: "u" | "d" = "d";

export function resetDirections() {
    hdir = "r";
    vdir = "d";
};

export function setPosition(container: HTMLUListElement, parentOrEvent: HTMLElement | MouseEvent): void {
    const rect = getUnmountedBoundingRect(container);

    // round up to full integer width/height for pixel perfect rendering
    rect.width = Math.trunc(rect.width) + 1;
    container.style.width = rect.width + "px";
    rect.height = Math.trunc(rect.height) + 1;
    container.style.height = rect.height + "px";

    let pos = { x: 0, y: 0 };
    if (parentOrEvent instanceof Element) {
        const { x, width, y } = getBoundingRect(parentOrEvent);
        pos = {
            x: hdir === "r" ? x + width : x - rect.width,
            y
        };
        if (/* is submenu */ parentOrEvent.className.includes("submenu")) {
            pos.y += (vdir === "d" ? 4 : -12) // add 8px vertical submenu offset: -4px means no vertical movement with default styles
        }
        const savePos = getPosition(rect, pos);
        // change direction when reaching edge of screen
        if (pos.x !== savePos.x) {
            hdir = hdir === "r" ? "l" : "r";
            pos.x = hdir === "r" ? x + width : x - rect.width;
        }
        if (pos.y !== savePos.y) {
            vdir = vdir === "u" ? "d" : "u";
            pos.y = savePos.y
        }
        /* on very tiny screens, the submenu may overlap the parent menu,
         * so we recalculate the position again*/
        pos = getPosition(rect, pos);
    } else {
        const scale = getScale();
        const body = document.body.getBoundingClientRect();
        pos = getPosition(rect, {
            x: (parentOrEvent.clientX - body.x) / scale.x,
            y: (parentOrEvent.clientY - body.y) / scale.y
        });
    }

    container.style.left = pos.x + "px";
    container.style.top = pos.y + "px";
}

/** returns a save position inside the viewport, given the desired position */
function getPosition(rect: Rect, pos: Pos): Pos {
    const { width, height, pageLeft, pageTop } = window.visualViewport;
    const { left, top } = document.body.getBoundingClientRect();
    const scale = getScale();
    const minX = (pageLeft - left) / scale.x;
    const minY = (pageTop - top) / scale.y;
    const maxX = (width - left) / scale.x;
    const maxY = (height - top) / scale.y;

    return {
        x: hdir === "r"
            ? pos.x + rect.width > maxX ? maxX - rect.width : pos.x
            : pos.x < minX ? minX : pos.x,
        y: vdir === "d"
            ? pos.y + rect.height > maxY ? maxY - rect.height : pos.y
            : pos.y < minY ? minY : pos.y
    };
}

function getUnmountedBoundingRect(elem: HTMLElement): Rect {
    const container = elem.cloneNode(true) as HTMLElement;
    container.style.visibility = "hidden";
    document.body.appendChild(container);
    const result = getBoundingRect(container);
    document.body.removeChild(container);
    return result;
}

function getBoundingRect(elem: HTMLElement): Rect {
    const { offsetLeft: x, offsetTop: y, offsetHeight: height, offsetWidth: width } = elem;
    if (elem.offsetParent instanceof HTMLElement) {
        // This isn't too bad for performance, but it would be nice if we could get rid of the recursiveness
        const parent = getBoundingRect(elem.offsetParent);
        return {
            x: x + parent.x,
            y: y + parent.y,
            width: width,
            height: height
        }
    }
    return {
        x,
        y,
        width,
        height
    };
}

function getScale(): Pos {
    const body = document.body.getBoundingClientRect();
    const viewport = window.visualViewport;
    return {
        x: body.width / viewport.width,
        y: body.height / viewport.height
    };
}