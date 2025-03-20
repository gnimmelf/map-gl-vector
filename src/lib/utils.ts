export const stringToBool = (val: any) => {
    if (typeof val === 'string') {
        if (isNaN(parseInt(val))) {
            // Not a number-string
            return val === 'true'
        }
        // Is a number-string
        return !!parseInt(val)
    }
    return !!val
}

export const flags = Object.freeze({
    debug: stringToBool(new URLSearchParams(document.location.search).get("debug")),
    elevation: stringToBool(new URLSearchParams(document.location.search).get("elevation"))
})

console.log({ flags })

export const throttle = (func: Function, timeFrame: number) => {
    let lastTime = 0;
    return (...args: any[]) => {
        let now = new Date() as unknown as number;
        if (now - lastTime >= timeFrame) {
            func(...args);
            lastTime = now;
        }
    };
}

export const bearingToRotation = (initBearing: number) => {
    let currentAngle = initBearing
    return (bearing: number) => {
        let delta = (bearing - currentAngle + 180) % 360 - 180;
        currentAngle = currentAngle + delta;
        return 360 - currentAngle
    }
}

export const dir = (obj: any, depth = 0) => console.dir(obj, { depth });

export async function waitForProperty(obj: Object, property: string) {
    return new Promise((resolve) => {
        const checkProperty = setInterval(() => {
            //@ts-expect-error
            if (obj[property] !== undefined) {
                clearInterval(checkProperty);
                //@ts-expect-error
                resolve(obj[property]);
            }
        }, 100); // Check every 100ms
    });
}

export class Sampler {
    count: number
    label: string

    constructor(label: string) {
        this.count = 0
        this.label = label
        this.log.bind(this)
    }

    log(logger: (sampler: Sampler) => void) {
        logger(this)
    }
}