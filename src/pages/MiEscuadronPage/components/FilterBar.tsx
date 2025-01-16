interface FilterBarProps {
  selected: "all" | "apto" | "orden" | "condicion";
  onChange: (filter: "all" | "apto" | "orden" | "condicion") => void;
}

export function FilterBar({ selected, onChange }: FilterBarProps) {
  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => onChange("all")}
        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200
          ${
            selected === "all"
              ? "bg-blue-100 text-blue-800"
              : "text-gray-500 hover:bg-gray-100"
          }`}
      >
        Todos
      </button>
      <button
        onClick={() => onChange("apto")}
        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200
          ${
            selected === "apto"
              ? "bg-green-100 text-green-800"
              : "text-gray-500 hover:bg-gray-100"
          }`}
      >
        Apto
      </button>
      <button
        onClick={() => onChange("orden")}
        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200
          ${
            selected === "orden"
              ? "bg-yellow-100 text-yellow-800"
              : "text-gray-500 hover:bg-gray-100"
          }`}
      >
        Orden de mérito
      </button>
      <button
        onClick={() => onChange("condicion")}
        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200
          ${
            selected === "condicion"
              ? "bg-purple-100 text-purple-800"
              : "text-gray-500 hover:bg-gray-100"
          }`}
      >
        Condición
      </button>
    </div>
  );
}
