import { useEffect } from 'react';
import { useRouter } from 'next/router';

const CatchAllRoute = () => {
  const router = useRouter();
  const { slug } = router.query;

  useEffect(() => {
    // Make sure the slug is defined before redirecting
    if (slug) {
      const slugValue = Array.isArray(slug) ? slug.join('/') : slug;
      router.push(`/api/redirect/${slugValue}`);
    }
  }, [slug, router]);

  return (
    <div>
      <h3>Redirecting...</h3>
    </div>
  );
};

export default CatchAllRoute;