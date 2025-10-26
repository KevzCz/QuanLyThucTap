interface FilterOption<T = string> {
  key: T;
  label: string;
}

interface FilterButtonGroupProps<T = string> {
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

function FilterButtonGroup<T extends string>({ options, value, onChange }: FilterButtonGroupProps<T>) {
  return (
    <div className="flex gap-1.5 sm:gap-2 overflow-x-auto touch-manipulation">
      {options.map(({ key, label }) => (
        <button
          key={String(key)}
          onClick={() => onChange(key)}
          className={`h-8 sm:h-9 rounded-md px-2.5 sm:px-3 text-xs sm:text-sm border transition whitespace-nowrap touch-manipulation ${
            value === key
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default FilterButtonGroup;
