import { create } from 'zustand';

interface ActiveCall {
  leadId: number;
  leadName: string;
  seconds: number;
  startTime: string;
  interval: any;
}

interface CallState {
  activeCall: ActiveCall | null;
  setActiveCall: (call: ActiveCall | null) => void;
  tick: () => void;
}

export const useCallStore = create<CallState>((set) => ({
  activeCall: null,
  setActiveCall: (call) => set({ activeCall: call }),
  tick: () => set(state => state.activeCall ? { activeCall: { ...state.activeCall, seconds: state.activeCall.seconds + 1 } } : state),
}));
