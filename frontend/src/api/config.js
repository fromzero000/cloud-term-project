const DEFAULT_API_BASE_URL =
    "http://taxi-team9-alb-2054411194.ap-northeast-2.elb.amazonaws.com";

const DEFAULT_WS_BASE_URL =
    "ws://taxi-team9-alb-2054411194.ap-northeast-2.elb.amazonaws.com";

export const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;

export const WS_BASE_URL =
    import.meta.env.VITE_WS_BASE_URL || DEFAULT_WS_BASE_URL;

