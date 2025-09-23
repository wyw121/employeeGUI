export enum AuthStep {
  PREREQUISITES = 'prereq',
  USB_TRUST = 'usb',
  WIRELESS = 'wireless',
  VERIFY = 'verify',
  DONE = 'done',
}

export interface AuthState {
  step: AuthStep;
  busy: boolean;
  logs: string[];
  userConfirmedUsbAllow: boolean;
}

export type AuthAction =
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'GOTO'; step: AuthStep }
  | { type: 'RESET' }
  | { type: 'SET_BUSY'; busy: boolean }
  | { type: 'LOG'; msg: string }
  | { type: 'CLEAR_LOG' }
  | { type: 'SET_USB_CONFIRMED'; value: boolean };

export const initialAuthState: AuthState = {
  step: AuthStep.PREREQUISITES,
  busy: false,
  logs: [],
  userConfirmedUsbAllow: false,
};
