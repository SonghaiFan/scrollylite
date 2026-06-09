export function createDefaultTransitionPlan(previousSpec: any, nextSpec: any, options?: {}): {
    diff?: undefined;
    update?: undefined;
    enter?: undefined;
    exit?: undefined;
} | {
    diff: {
        type: any;
        action: any;
        previous: any;
        next: any;
    }[];
    update: {
        mode: string;
        reason: any;
        timing: {
            stagger: any;
            duration: number;
            ease: string;
        };
        totalDuration: number;
    };
    enter: {
        mode: string;
        reason: any;
    };
    exit: {
        mode: string;
        reason: any;
    };
};
