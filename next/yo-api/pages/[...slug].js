import { useRouter } from 'next/router';

const CatchAllRoute = () => {
  const router = useRouter();
  const { slug } = router.query;
  
  console.log(router);
  console.log(router.query.slug); // This will be an array of the path segments

  return (
    <div>
      <h1>Yo Route</h1>
      <p>Path: {slug ? slug.join('/') : 'null'}</p>
    </div>
  );
};

export default CatchAllRoute;