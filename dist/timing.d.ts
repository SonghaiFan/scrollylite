export function defaultTransition(overrides?: {}): {
    stagger: any;
    duration: number;
    ease: string;
};
export function stagedDuration(totalDuration: any, stageCount: any): number;
export namespace DEFAULT_TIMING {
    namespace transition {
        let duration: number;
        let ease: string;
        namespace stagger {
            let step: number;
            let max: number;
        }
    }
    namespace scene {
        export namespace stagger_1 {
            let step_1: number;
            export { step_1 as step };
            let max_1: number;
            export { max_1 as max };
        }
        export { stagger_1 as stagger };
    }
    namespace stage {
        let minDuration: number;
    }
    namespace unit {
        export let axisDurationMultiplier: number;
        export let xRatio: number;
        export namespace stagger_2 {
            let step_2: number;
            export { step_2 as step };
            let max_2: number;
            export { max_2 as max };
        }
        export { stagger_2 as stagger };
        export namespace xStagger {
            let step_3: number;
            export { step_3 as step };
            let max_3: number;
            export { max_3 as max };
        }
    }
}
