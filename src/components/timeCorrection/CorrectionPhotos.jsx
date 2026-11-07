// The time in / time out proof photos of a time correction (if any),
// as small thumbnails that open full size.
export default function CorrectionPhotos({ item, className = "" }) {
  const photos = [
    ["Time in", item.time_in_photo_url],
    ["Time out", item.time_out_photo_url],
  ].filter(([, url]) => url);
  if (!photos.length) return null;
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {photos.map(([label, url]) => (
        <a key={label} href={url} target="_blank" rel="noreferrer" className="text-center">
          <img
            src={url}
            alt={`${label} proof`}
            className="h-16 w-16 rounded-lg border border-border object-cover hover:opacity-80"
          />
          <span className="mt-0.5 block text-[10px] text-fg-subtle">{label}</span>
        </a>
      ))}
    </div>
  );
}
