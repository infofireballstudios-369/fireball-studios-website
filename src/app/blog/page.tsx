import { PageHeader, ContactBanner } from "@/components/ui/PageHeader";
import { BlogSearch } from "@/components/ui/BlogSearch";
import { blogPosts } from "@/lib/blogData";
import { routeMetadata } from "@/lib/metadata";
export const metadata = routeMetadata("/blog");
export default function BlogPage() {
  return <main id="main"><PageHeader path="/blog" eyebrow="The studio journal" title="A little more perspective." description="Practical ideas, visualisation insights and a closer look at how good imagery comes together." image="/posters/2.webp" /><section className="section section-pad"><BlogSearch posts={blogPosts} /></section><ContactBanner /></main>;
}
