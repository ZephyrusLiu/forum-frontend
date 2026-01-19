import { useParams } from 'react-router-dom';
import PageShell from '../components/PageShell.jsx';

export default function Profile() {
  const { id } = useParams();
  return (
    <PageShell title={`/users/${id}/profile`}>
      <p>Placeholder profile page for userId: {id}</p>
    </PageShell>
  );
}
