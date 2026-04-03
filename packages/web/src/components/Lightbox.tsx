import { motion, AnimatePresence } from "framer-motion";

type Props = {
  src: string;
  mediaType: "image" | "video";
  onClose: () => void;
};

export function Lightbox({ src, mediaType, onClose }: Props) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="max-w-4xl max-h-[90vh] relative"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute -top-10 right-0 text-white text-3xl hover:text-gray-300"
          >
            &times;
          </button>
          {mediaType === "image" ? (
            <img
              src={src}
              alt=""
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
          ) : (
            <video
              src={src}
              controls
              autoPlay
              className="max-w-full max-h-[85vh] rounded-lg"
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
