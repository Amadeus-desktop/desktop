const controls = [
  { name: "close", className: "bg-[#ff5f56]" },
  { name: "minimize", className: "bg-[#ffbd2e]" },
  { name: "maximize", className: "bg-[#27c93f]" },
];

export function WindowControls() {
  return (
    <div className="mb-6 ml-2.5 flex gap-2" aria-hidden="true">
      {controls.map((control) => (
        <span
          key={control.name}
          className={`size-3 rounded-full ${control.className}`}
        />
      ))}
    </div>
  );
}

