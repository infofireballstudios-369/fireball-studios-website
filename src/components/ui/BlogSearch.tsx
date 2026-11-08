"use client";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, ArrowUpRight } from "lucide-react";
import type { BlogPost } from "@/lib/blogData";
import { formatDate } from "@/lib/formatDate";

export function BlogSearch({ posts }: { posts: BlogPost[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const categories = ["All", ...new Set(posts.map((post) => post.category))];
  const filtered = useMemo(() => posts.filter((post) => {
    const text = [post.title, post.excerpt, post.category, ...post.content.flatMap((section) => [section.heading, ...section.paragraphs, ...(section.bullets ?? [])])].join(" ").toLowerCase();
    return (category === "All" || post.category === category) && query.trim().toLowerCase().split(/\s+/).every((term) => text.includes(term));
  }), [posts, query, category]);
  return (
    <>
      <div className="search-field"><Search size={19} aria-hidden="true" /><label className="sr-only" htmlFor="blog-search">Search articles</label><input id="blog-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ideas, materials, walkthroughs…" /></div>
      <div className="filter-bar" aria-label="Filter articles">{categories.map((item) => <button key={item} aria-pressed={item === category} onClick={() => setCategory(item)}>{item}</button>)}</div>
      <p className="results-count" role="status">{filtered.length} {filtered.length === 1 ? "article" : "articles"}</p>
      <div className="grid-two blog-grid">{filtered.map((post) => <article className="blog-card" key={post.slug}><Link href={"/blog/" + post.slug} className="blog-card-image"><Image src={post.image} alt="A Fireball Studios visualisation study" fill sizes="(max-width:800px) 90vw, 45vw" /><span className="project-open"><ArrowUpRight aria-hidden="true" /></span></Link><div className="article-meta"><span>{post.category}</span><span>{post.readTime} min read</span></div><h2><Link href={"/blog/" + post.slug}>{post.title}</Link></h2><p>{post.excerpt}</p><time dateTime={post.publishDate}>{formatDate(post.publishDate)}</time></article>)}</div>
      {filtered.length === 0 && <div className="empty-state"><h2>No articles match that search.</h2><p>Try a broader term, or explore all our visualisation insights.</p><button className="button button-outline" onClick={() => { setQuery(""); setCategory("All"); }}>Clear filters</button></div>}
    </>
  );
}
