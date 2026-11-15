// Contacts-style monogram: initials on a soft gradient. Decorative; the name is always shown next to it.
const GRADIENTS: Record<string, string> = {
  jordan: "from-[#6cb4f7] to-[#2a78d6]",
  sam: "from-[#f8ad6a] to-[#d9622b]",
  mia: "from-[#f59bc0] to-[#cf4a82]",
  rosa: "from-[#bb98f3] to-[#7a52d6]",
};

/** Soft pastel wash behind a person's avatar in list rows (Health app "Sharing" style). Decorative. */
const PANELS: Record<string, string> = {
  jordan: "linear-gradient(135deg, #cfe5ff, #a9c9f5 55%, #d8cdfb)",
  sam: "linear-gradient(135deg, #ffe0bf, #f9b98a 55%, #f7c8d6)",
  mia: "linear-gradient(135deg, #ffd6e7, #f5a9c9 55%, #fbd9b5)",
  rosa: "linear-gradient(135deg, #e3d5ff, #c2a8f2 55%, #b9e4f0)",
};
export const avatarPanel = (id: string) => PANELS[id] ?? "linear-gradient(135deg, #e5e5ea, #c7c7cc)";

export default function Avatar({ id, name, size = 44 }: { id: string; name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-b font-semibold text-white shadow-sm ${
        GRADIENTS[id] ?? "from-[#a5abb8] to-[#7d828d]"
      }`}
    >
      {initials}
    </span>
  );
}
