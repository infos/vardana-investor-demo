import LiveKitVoiceOverlay from "./components/LiveKitVoiceOverlay.jsx";

// Engineering QA surface for the EC2 voice pipeline. Lives at /voice-test,
// intentionally separate from the demo flow at /demo/{token} and from
// /coordinator so investor-facing surfaces don't see this. The actual
// LiveKit + session lifecycle logic lives in <LiveKitVoiceOverlay> and
// is shared with the per-patient detail view at /coordinator?patient=…

export default function VoiceTestPage() {
  return (
    <LiveKitVoiceOverlay
      patient={{ slug: "marcus-williams-test", name: "Marcus Williams" }}
      sessionMode="voice-test"
    />
  );
}
