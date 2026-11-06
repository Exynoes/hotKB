import ResultsPage from '../../../components/ResultsPage';

export default async function Page({ params }: { params: Promise<{ raceId: string }> }) {
  const { raceId } = await params;
  return <ResultsPage raceId={raceId} />;
}
