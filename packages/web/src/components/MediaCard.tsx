import { api } from "../api";

type Props = {
  item: {
    id: string;
    file_key: string;
    thumbnail_key: string | null;
    media_type: "image" | "video";
    caption: string | null;
    uploaded_at: string;
    display_name: string;
  };
  onClick: () => void;
};

export function MediaCard({ item, onClick }: Props) {
  const src = api.gallery.fileUrl(item.thumbnail_key || item.file_key);
  const date = new Date(item.uploaded_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className="group cursor-pointer rounded-xl overflow-hidden shadow-lg bg-white hover:shadow-xl transition-shadow"
      onClick={onClick}
    >
      <div className="aspect-square overflow-hidden bg-gray-100">
        {item.media_type === "image" ? (
          <img
            src={src}
            alt={item.caption || ""}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="relative w-full h-full">
            <video
              src={api.gallery.fileUrl(item.file_key)}
              className="w-full h-full object-cover"
              muted
              preload="metadata"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 bg-white/80 rounded-full flex items-center justify-center">
                <div className="w-0 h-0 border-l-[16px] border-l-purple-600 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent ml-1" />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="p-3">
        {item.caption && (
          <p className="text-gray-700 text-sm mb-1 line-clamp-2">
            {item.caption}
          </p>
        )}
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>{item.display_name}</span>
          <span>{date}</span>
        </div>
      </div>
    </div>
  );
}
