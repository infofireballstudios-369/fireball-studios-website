import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { PageHeader, ContactBanner } from "@/components/ui/PageHeader";
import { JsonLd } from "@/components/ui/JsonLd";
import { VimeoPlayer } from "@/components/ui/VimeoPlayer";
import { blogPosts, getBlogPost } from "@/lib/blogData";
import { getArticleSchema } from "@/lib/schema";
import { routeMetadata } from "@/lib/metadata";
import { formatDate } from "@/lib/formatDate";
type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export function generateStaticParams() { return blogPosts.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: Props) {
  const post = getBlogPost((await params).slug);
  if (!post) return {};
  return routeMetadata("/blog/" + post.slug);
}
export default async function ArticlePage({ params }: Props) {
  const post = getBlogPost((await params).slug);
  if (!post) notFound();
  return (
    <main id="main">
      <JsonLd data={getArticleSchema(post)} />
      <PageHeader path={"/blog/" + post.slug} eyebrow={post.category} title={post.title} description={post.excerpt} image={post.image} />
      <div className="article-layout section-pad section">
        <aside className="article-aside"><p className="small-label">In this article</p><nav aria-label="Article contents">{post.content.map((section, index) => <a href={"#section-" + (index + 1)} key={section.heading}>{section.heading}</a>)}</nav><Link className="text-link" href="/blog"><ArrowLeft size={16} />All insights</Link></aside>
        <article className="article-body"><div className="article-byline"><span>By {post.author}</span><time dateTime={post.publishDate}>{formatDate(post.publishDate)}</time><span>{post.readTime} min read</span></div>{post.video && <VimeoPlayer key={post.video.id} video={post.video} title={post.title} poster={post.image} posterAlt="A spaceship concept in a cinematic hangar environment" className="project-showreel" />}{post.content.map((section, index) => <section id={"section-" + (index + 1)} key={section.heading}><h2>{section.heading}</h2>{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}</section>)}<div className="article-next"><p className="small-label">Keep exploring</p>{blogPosts.filter((item) => item.slug !== post.slug).slice(0, 2).map((item) => <Link key={item.slug} href={"/blog/" + item.slug}>{item.title}<ArrowUpRight size={18} /></Link>)}</div></article>
      </div>
      <ContactBanner />
    </main>
  );
}
