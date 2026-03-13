/**
 * 앱 _buildSectionTitle — headlineSmall, textPrimary
 */
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-semibold text-ink">
      {children}
    </h2>
  );
}
