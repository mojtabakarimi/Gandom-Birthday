import { useState } from "react";
import { MediaCard } from "./MediaCard";
import { Lightbox } from "./Lightbox";
import { api } from "../api";

type GalleryItem = {
  id: string;
  file_key: string;
  thumbnail_key: string | null;
  media_type: "image" | "video";
  caption: string | null;
  uploaded_at: string;
  display_name: string;
};

type Props = { items: GalleryItem[] };

export function GalleryGrid({ items }: Props) {
  const [selected, setSelected] = useState<GalleryItem | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item) => (
          <MediaCard
            key={item.id}
            item={item}
            onClick={() => setSelected(item)}
          />
        ))}
      </div>

      {selected && (
        <Lightbox
          src={api.gallery.fileUrl(selected.file_key)}
          mediaType={selected.media_type}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
