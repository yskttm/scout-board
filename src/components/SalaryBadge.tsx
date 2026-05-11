type SalaryClass = "normal" | "high" | "very_high" | "unknown";

const config: Record<SalaryClass, { bg: string; text: string }> = {
  normal: { bg: "bg-gray-100", text: "text-gray-700" },
  high: { bg: "bg-yellow-50", text: "text-yellow-700" },
  very_high: { bg: "bg-green-50", text: "text-green-700" },
  unknown: { bg: "bg-gray-50", text: "text-gray-400" },
};

interface Props {
  expectedSalary: string | null;
  salaryClass: string;
}

export default function SalaryBadge({ expectedSalary, salaryClass }: Props) {
  const cls = (salaryClass as SalaryClass) in config ? (salaryClass as SalaryClass) : "unknown";
  const { bg, text } = config[cls];

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-sm font-medium ${bg} ${text} whitespace-nowrap`}
    >
      {expectedSalary ?? "非公開"}
    </span>
  );
}
