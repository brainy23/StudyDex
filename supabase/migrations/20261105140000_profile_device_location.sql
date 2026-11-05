-- null = not answered, true = use device location, false = use Singapore.
-- Stores the preference only; device coordinates are never saved here.
BEGIN;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS device_loc boolean DEFAULT NULL;
ALTER TABLE public.profiles ALTER COLUMN device_loc SET DEFAULT NULL;
ALTER TABLE public.profiles ALTER COLUMN device_loc DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.get_device_location_preference()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid(); preference boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sign in to load your location preference.'; END IF;
  SELECT device_loc INTO preference FROM public.profiles WHERE id=uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Your profile was not found.'; END IF;
  RETURN jsonb_build_object('user_id',uid,'device_loc',preference);
END $$;

CREATE OR REPLACE FUNCTION public.set_device_location_preference(p_device_loc boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE uid uuid:=auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Sign in to save your location preference.'; END IF;
  IF p_device_loc IS NULL THEN RAISE EXCEPTION 'Choose whether to use device location.'; END IF;
  UPDATE public.profiles SET device_loc=p_device_loc WHERE id=uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Your profile was not found.'; END IF;
  RETURN jsonb_build_object('user_id',uid,'device_loc',p_device_loc);
END $$;

REVOKE ALL ON FUNCTION public.get_device_location_preference() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.set_device_location_preference(boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_device_location_preference() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_device_location_preference(boolean) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
