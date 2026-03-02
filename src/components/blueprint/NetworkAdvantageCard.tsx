interface NetworkAdvantage {
  first_ten_customers: string;
  distribution_channel: string;
  credibility_signal: string;
  fvs_impact: string;
}

interface NetworkAdvantageCardProps {
  networkAdvantage: NetworkAdvantage;
}

const SECTIONS = [
  { key: "first_ten_customers", label: "YOUR FIRST 10 CUSTOMERS" },
  { key: "distribution_channel", label: "DISTRIBUTION CHANNEL" },
  { key: "credibility_signal", label: "NETWORK CREDIBILITY SIGNAL" },
  { key: "fvs_impact", label: "FVS IMPACT" },
] as const;

export const NetworkAdvantageCard = ({ networkAdvantage }: NetworkAdvantageCardProps) => {
  return (
    <div className="border border-border bg-card">
      <div className="px-6 py-4 border-b border-border">
        <span className="label-mono-gold">NETWORK ADVANTAGE</span>
      </div>
      <div>
        {SECTIONS.map((section) => (
          <div key={section.key} className="data-row flex-col items-start gap-1">
            <span className="label-mono">{section.label}</span>
            <p className="text-sm font-light text-foreground leading-relaxed">
              {networkAdvantage[section.key]}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
