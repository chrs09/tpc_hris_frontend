const SummaryCard = ({ label, value }) => (
  <div
    className="
    bg-[#023047]
    rounded-xl
    px-4 py-4
    sm:px-5 sm:py-5
    md:px-6 md:py-6
    shadow
    transition-all
  "
  >
    <p
      className="
      text-xl
      sm:text-2xl
      md:text-3xl
      font-bold
      text-white
    "
    >
      {value ?? 0}
    </p>

    <p
      className="
      text-xs
      sm:text-sm
      text-gray-200
      mt-1
    "
    >
      {label}
    </p>
  </div>
);

export default SummaryCard;
