// What the employee worked on, typed at time out, with the photo/video
// proof -- asked only of people whose head's Org Chart unit ticks "Work
// accomplished". No proof sends the time out to that head for review.
const VIDEO_EXT = /\.(mp4|mov|m4v|webm|3gp|3gpp)(\?|$)/i;

export default function WorkReport({ text, proofUrl, missing, compact = false }) {
  if (!text && !proofUrl && !missing) return null;
  const isVideo = proofUrl && VIDEO_EXT.test(proofUrl);

  return (
    <div className="space-y-2 rounded-lg border border-border bg-surface-hover p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
        Work accomplished
      </p>
      {text ? (
        <p className="whitespace-pre-wrap text-sm text-fg">{text}</p>
      ) : (
        <p className="text-sm text-fg-subtle">Nothing written.</p>
      )}
      {proofUrl ? (
        isVideo ? (
          <video
            src={proofUrl}
            controls
            preload="metadata"
            className={`w-full rounded-md bg-black ${compact ? "max-h-40" : "max-h-72"}`}
          />
        ) : (
          <a href={proofUrl} target="_blank" rel="noreferrer" className="block">
            <img
              src={proofUrl}
              alt="Work proof"
              className={`w-full rounded-md object-cover ${compact ? "max-h-40" : "max-h-72"}`}
            />
          </a>
        )
      ) : (
        missing && (
          <p className="text-xs font-semibold text-warning">
            No photo or video uploaded -- needs the head&apos;s approval.
          </p>
        )
      )}
    </div>
  );
}
