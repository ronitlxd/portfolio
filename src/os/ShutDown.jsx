/**
 * Classic "It's now safe to turn off your computer" screen.
 * Restart replays the boot sequence.
 */
export default function ShutDown({ onRestart }) {
  return (
    <div className="shutdown-screen">
      <div className="big">
        It&apos;s now safe to turn off
        <br />
        your computer.
      </div>
      <button onClick={onRestart}>Restart</button>
    </div>
  )
}
