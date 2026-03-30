-- Run this in your Supabase SQL editor (adds community tables)

-- Community posts
create table public.posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  category text not null check (category in ('tip', 'question', 'freebie')),
  upvotes int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Post upvotes (one per user per post)
create table public.post_upvotes (
  user_id uuid references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  primary key (user_id, post_id)
);

-- Comments (on posts)
create table public.comments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  body text not null,
  created_at timestamptz default now()
);

-- Recipe comments
create table public.recipe_comments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  recipe_id text not null,
  body text not null,
  created_at timestamptz default now()
);

-- RLS
alter table public.posts enable row level security;
alter table public.post_upvotes enable row level security;
alter table public.comments enable row level security;
alter table public.recipe_comments enable row level security;

create policy "Anyone can view posts" on public.posts for select using (true);
create policy "Logged in users can insert posts" on public.posts for insert with check (auth.uid() = user_id);
create policy "Users can update own posts" on public.posts for update using (auth.uid() = user_id);
create policy "Users can delete own posts" on public.posts for delete using (auth.uid() = user_id);

create policy "Anyone can view upvotes" on public.post_upvotes for select using (true);
create policy "Users can upvote" on public.post_upvotes for insert with check (auth.uid() = user_id);
create policy "Users can remove upvote" on public.post_upvotes for delete using (auth.uid() = user_id);

create policy "Anyone can view comments" on public.comments for select using (true);
create policy "Logged in users can comment" on public.comments for insert with check (auth.uid() = user_id);
create policy "Users can delete own comments" on public.comments for delete using (auth.uid() = user_id);

create policy "Anyone can view recipe comments" on public.recipe_comments for select using (true);
create policy "Logged in users can comment on recipes" on public.recipe_comments for insert with check (auth.uid() = user_id);
create policy "Users can delete own recipe comments" on public.recipe_comments for delete using (auth.uid() = user_id);

-- Seed a few example posts
insert into public.posts (user_id, title, body, category, upvotes)
select id, 
  'Celery + almond butter = our go-to freebie snack',
  'My daughter loves this combo. The almond butter adds enough fat and protein to keep her satisfied without any spike. Make sure to get the natural kind with no added sugar!',
  'freebie',
  12
from public.profiles limit 1;

insert into public.posts (user_id, title, body, category, upvotes)
select id,
  'Pre-bolusing 15 minutes early changed everything for us',
  'Our endo suggested giving the insulin dose 15 minutes before meals instead of right when eating. Made a huge difference in post-meal spikes, especially for faster carbs like rice. Everyone is different but worth asking your care team about.',
  'tip',
  28
from public.profiles limit 1;

insert into public.posts (user_id, title, body, category, upvotes)
select id,
  'Does anyone else find cauliflower rice causes a spike?',
  'We switched to cauliflower rice thinking it was a true freebie but my son still gets a small spike. Wondering if it''s the volume or if we are missing something with our counts?',
  'question',
  8
from public.profiles limit 1;
