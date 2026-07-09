import { supabase } from './supabase'
import type { Ficha, Profile, Session } from './types'
import type { FichaOp } from './storage'

// Mapeamento snake_case (Postgres) ⇄ camelCase (app) + operações remotas.
// IDs são gerados no cliente (crypto.randomUUID) e os envios usam upsert,
// então reenvios da fila offline são idempotentes.

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    id: data.id,
    displayName: data.display_name,
    descansoSegundos: data.descanso_segundos,
    descansoAutomatico: data.descanso_automatico,
    metaSemanal: data.meta_semanal,
  }
}

export async function pushProfile(profile: Profile): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: profile.displayName,
      descanso_segundos: profile.descansoSegundos,
      descanso_automatico: profile.descansoAutomatico,
      meta_semanal: profile.metaSemanal,
    })
    .eq('id', profile.id)
  if (error) throw error
}

export async function fetchFichas(): Promise<Ficha[]> {
  const { data, error } = await supabase
    .from('fichas')
    .select('id, letter, grupo, position, ficha_exercises(id, name, position, sets_count, technique)')
    .eq('archived', false)
    .order('position')
  if (error) throw error
  return (data ?? []).map((f) => ({
    id: f.id,
    letter: f.letter,
    grupo: f.grupo,
    position: f.position,
    exercises: (f.ficha_exercises ?? [])
      .map((e: { id: string; name: string; position: number; sets_count: number; technique: string }) => ({
        id: e.id,
        name: e.name,
        position: e.position,
        setsCount: e.sets_count ?? 3,
        technique: e.technique ?? '',
      }))
      .sort((a: { position: number }, b: { position: number }) => a.position - b.position),
  }))
}

export async function fetchSessions(): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select(
      'id, date, ficha_id, ficha_letter, grupo, volume, duration_min, started_at, session_exercises(id, name, note, position, technique, session_sets(id, set_number, kg, reps, reps_detail, done))'
    )
    .order('date')
  if (error) throw error
  return (data ?? []).map((s) => ({
    id: s.id,
    date: s.date,
    fichaId: s.ficha_id,
    fichaLetter: s.ficha_letter,
    grupo: s.grupo,
    volume: Number(s.volume),
    durationMin: s.duration_min,
    startedAt: s.started_at,
    exercises: (s.session_exercises ?? [])
      .map((e: { id: string; name: string; note: string; position: number; technique: string; session_sets: { id: string; set_number: number; kg: number; reps: number; reps_detail: string; done: boolean }[] }) => ({
        id: e.id,
        name: e.name,
        note: e.note,
        position: e.position,
        technique: e.technique ?? '',
        sets: (e.session_sets ?? [])
          .map((t) => ({
            id: t.id,
            setNumber: t.set_number,
            kg: Number(t.kg),
            reps: t.reps,
            repsDetail: t.reps_detail ?? '',
            done: t.done,
          }))
          .sort((a, b) => a.setNumber - b.setNumber),
      }))
      .sort((a: { position: number }, b: { position: number }) => a.position - b.position),
  }))
}

export async function pushFichaOp(op: FichaOp): Promise<void> {
  if (op.ficha === null) {
    // Arquivamento (soft delete): o histórico de sessões da ficha permanece.
    const { error } = await supabase.from('fichas').update({ archived: true }).eq('id', op.fichaId)
    if (error) throw error
    return
  }
  const f = op.ficha
  const { error: fichaErr } = await supabase
    .from('fichas')
    .upsert({ id: f.id, letter: f.letter, grupo: f.grupo, position: f.position, archived: false })
  if (fichaErr) throw fichaErr

  if (f.exercises.length > 0) {
    const { error } = await supabase.from('ficha_exercises').upsert(
      f.exercises.map((e) => ({
        id: e.id,
        ficha_id: f.id,
        name: e.name,
        position: e.position,
        sets_count: e.setsCount ?? 3,
        technique: e.technique ?? '',
      }))
    )
    if (error) throw error
  }
  if (op.deletedExerciseIds.length > 0) {
    const { error } = await supabase.from('ficha_exercises').delete().in('id', op.deletedExerciseIds)
    if (error) throw error
  }
}

export async function pushSession(session: Session): Promise<void> {
  const { error: sessErr } = await supabase.from('sessions').upsert({
    id: session.id,
    date: session.date,
    ficha_id: session.fichaId,
    ficha_letter: session.fichaLetter,
    grupo: session.grupo,
    volume: session.volume,
    duration_min: session.durationMin,
    started_at: session.startedAt,
  })
  if (sessErr) throw sessErr

  const exRows = session.exercises.map((e) => ({
    id: e.id,
    session_id: session.id,
    name: e.name,
    note: e.note,
    position: e.position,
    technique: e.technique ?? '',
  }))
  if (exRows.length > 0) {
    const { error } = await supabase.from('session_exercises').upsert(exRows)
    if (error) throw error
  }

  const setRows = session.exercises.flatMap((e) =>
    e.sets.map((t) => ({
      id: t.id,
      session_exercise_id: e.id,
      set_number: t.setNumber,
      kg: t.kg,
      reps: t.reps,
      reps_detail: t.repsDetail ?? '',
      done: t.done,
    }))
  )
  if (setRows.length > 0) {
    const { error } = await supabase.from('session_sets').upsert(setRows)
    if (error) throw error
  }
}
