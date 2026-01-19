import { useParams } from 'react-router-dom';
import PageShell from '../components/PageShell.jsx';

export default function PostDetail() {
  const { id } = useParams();
  return (
    <PageShell title={`/posts/${id}`}>
      <p>Placeholder post detail page for postId: {id}</p>
    </PageShell>
  );
}
