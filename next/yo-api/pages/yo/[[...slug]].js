import { useRouter } from 'next/router';

const CatchAllRoute = () => {
  const router = useRouter();
  const { slug } = router.query;

  return (
    <div>
      <h1>Catch-All Route</h1>
      {slug ? (
        <p>Path: {slug.join('/')}</p>
      ) : (
        <p>No specific path, this is the root</p>
      )}
    </div>
  );
};

export default CatchAllRoute;