import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const leads = [
  { name: 'Esse Tuke', firm_name: 'The Tuke Firm', email: '2KTeam@TheTukeFirm.com', city: 'Troy', state: 'MI' },
  { name: 'Amy Byer', firm_name: 'Amy Byer Law', email: 'amy@amybyerlaw.com', city: 'Bloomfield Hills', state: 'MI' },
  { name: 'Brian Garmo', firm_name: 'Garmo & Kiste', email: 'info@garmokiste.com', city: 'Troy', state: 'MI' },
  { name: 'Lori Becker', firm_name: 'Becker Legal', email: 'lbecker@beckerlegalgroup.com', city: 'Bloomfield Hills', state: 'MI' },
  { name: 'James Hubbert', firm_name: 'Graham & Hubbert', email: 'jh@hubbertlaw.com', city: 'Bloomfield Hills', state: 'MI' },
  { name: 'John Owdziej', firm_name: 'Washtenaw County Divorce', email: 'johnowdziej@gmail.com', city: 'Ann Arbor', state: 'MI' },
  { name: 'Wendy Alton', firm_name: 'Wendy Alton Family Law', email: 'wendy@wendyaltonlaw.com', city: 'Ann Arbor', state: 'MI' },
  { name: 'Veronique Liem', firm_name: 'Law & Mediation Office', email: 'vliem@liemlaw.com', city: 'Ann Arbor', state: 'MI' },
  { name: 'Colline Cheltenham', firm_name: 'Cheltenham Law', email: 'colline@cheltenhamlaw.com', city: 'East Lansing', state: 'MI' },
  { name: 'Natalie Alane', firm_name: 'Alane Family Law', email: 'natalie@alanefamilylaw.com', city: 'Lansing', state: 'MI' },
  { name: 'Stuart Shafer', firm_name: 'Stuart R. Shafer PC', email: 'stu@stushafer.com', city: 'Lansing', state: 'MI' },
  { name: 'Anne Lewis', firm_name: 'Anne E. Lewis PLC', email: 'info@annelewisplc.com', city: 'Grand Rapids', state: 'MI' },
  { name: 'Erica Auster', firm_name: 'West Michigan Divorce', email: 'erica@westmichigandivorce.com', city: 'Grand Rapids', state: 'MI' },
  { name: 'Michele Giordano', firm_name: 'Giordano Law', email: 'michele@giordanolawplc.com', city: 'Grand Rapids', state: 'MI' },
  { name: 'Christian Krupp', firm_name: 'Krupp Law Offices', email: 'chris@krupplaw.com', city: 'Grand Rapids', state: 'MI' },
  { name: 'Colleen Markou', firm_name: 'Markou Law', email: 'reception@markoulaw.com', city: 'Kalamazoo', state: 'MI' },
  { name: 'Allison Greenlee Korr', firm_name: 'Greenlee Law', email: 'allison@greenlee-law.com', city: 'Kalamazoo', state: 'MI' },
  { name: 'Tara Parker', firm_name: 'Law Offices of Tara Parker', email: 'attorneytaraparker@gmail.com', city: 'Flint', state: 'MI' },
  { name: 'Leo Garbuzov', firm_name: 'Garbuzov Law Firm', email: 'leo@leolegalsolutions.com', city: 'Farmington Hills', state: 'MI' },
  { name: 'Julian Poota', firm_name: 'Law Office of Julian Poota', email: 'julian@pootalaw.com', city: 'Southfield', state: 'MI' },
  { name: 'Daniel Findling', firm_name: 'Findling Law', email: 'dan@thedivorceguy.com', city: 'Royal Oak', state: 'MI' },
  { name: 'Carlo Martina', firm_name: 'Carlo J. Martina PC', email: 'info@martinalaw.com', city: 'Plymouth', state: 'MI' },
  { name: 'Alexandria Brady', firm_name: 'Brady & McGrandy', email: 'abrady@bradylaw.org', city: 'Saginaw', state: 'MI' },
  { name: 'Curtis Brelinski', firm_name: 'Curtis Curtis & Brelinski', email: 'info@curtiscurtislaw.com', city: 'Jackson', state: 'MI' },
  { name: 'Barry Fayne', firm_name: 'Fayne Law', email: 'barryf3@aol.com', city: 'Southfield', state: 'MI' },
]

async function main() {
  const { createClient } = require('@supabase/supabase-js')
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const now = new Date().toISOString()
  const rows = leads.map(l => ({
    ...l,
    source: 'manual',
    status: 'email_1_sent',
    sequence_step: 1,
    last_contacted_at: now,
    next_contact_at: new Date(Date.now() + 3 * 86400000).toISOString(),
  }))

  const { error } = await supabase.from('outreach_leads').insert(rows)
  if (error) {
    console.error('Insert error:', error.message)
  } else {
    console.log(`Inserted ${rows.length} Michigan leads`)
  }

  // Clean bad emails from scraper (image URLs etc)
  const { data: bad } = await supabase
    .from('outreach_leads')
    .select('id, email')
    .or('email.like.%.png,email.like.%.jpg,email.like.%.svg,email.like.%.gif')

  if (bad && bad.length > 0) {
    const ids = bad.map((r: { id: string }) => r.id)
    await supabase.from('outreach_leads').update({ email: null }).in('id', ids)
    console.log(`Cleaned ${bad.length} bad email addresses`)
  }
}

main()
