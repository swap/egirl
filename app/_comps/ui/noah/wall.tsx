import { Shot } from "@/app/_comps/ui/noah/shot";
import { lanes, type Img } from "@/app/_comps/ui/noah/shared";

export function Wall({
  items,
  n,
  className,
  edit,
  onOpen,
  onDelete,
}: {
  items: Img[];
  n: number;
  className: string;
  edit: boolean;
  onOpen: (img: Img) => void;
  onDelete: (img: Img) => void;
}) {
  return (
    <div className={className}>
      {lanes(items, n).map((col, c) => (
        <div key={c} className="flex flex-col gap-3 sm:gap-3.5">
          {col.map(({ img, i }) => (
            <Shot
              key={img.url}
              img={img}
              delay={Math.min(i * 40, 280)}
              edit={edit}
              onOpen={() => onOpen(img)}
              onDelete={onDelete}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
