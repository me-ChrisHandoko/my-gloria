--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: gloria_master; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA gloria_master;


ALTER SCHEMA gloria_master OWNER TO postgres;

--
-- Name: gloria_ops; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA gloria_ops;


ALTER SCHEMA gloria_ops OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: data_karyawan; Type: TABLE; Schema: gloria_master; Owner: postgres
--

CREATE TABLE gloria_master.data_karyawan (
    nip character varying(15) NOT NULL,
    nama character varying(109),
    jenis_kelamin character varying(1),
    tgl_mulai_bekerja timestamp with time zone,
    tgl_tetap timestamp with time zone,
    status character varying(10),
    waktu_kerja_kependidikan character varying(10),
    bagian_kerja character varying(50),
    lokasi character varying(20),
    bidang_kerja character varying(70),
    jenis_karyawan character varying(20),
    status_aktif character varying(8),
    no_ponsel character varying(25),
    email character varying(100),
    birthdate timestamp with time zone,
    rfid character varying(100)
);


ALTER TABLE gloria_master.data_karyawan OWNER TO postgres;

--
-- Name: api_keys; Type: TABLE; Schema: gloria_ops; Owner: postgres
--

CREATE TABLE gloria_ops.api_keys (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    key_hash character varying(255) NOT NULL,
    prefix character varying(10) NOT NULL,
    last_four_chars character varying(4) NOT NULL,
    algorithm character varying(20) DEFAULT 'argon2id'::character varying,
    user_id character varying(36) NOT NULL,
    description text,
    permissions jsonb,
    rate_limit bigint,
    allowed_ips text[],
    last_used_at timestamp with time zone,
    last_used_ip character varying(45),
    usage_count bigint DEFAULT 0,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE gloria_ops.api_keys OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: gloria_ops; Owner: postgres
--

CREATE TABLE gloria_ops.audit_logs (
    id character varying(36) NOT NULL,
    actor_id character varying(100) NOT NULL,
    actor_profile_id character varying(36),
    action character varying(20) NOT NULL,
    module character varying(100) NOT NULL,
    entity_type character varying(100) NOT NULL,
    entity_id character varying(100) NOT NULL,
    entity_display character varying(255),
    old_values jsonb,
    new_values jsonb,
    changed_fields jsonb,
    target_user_id character varying(36),
    metadata jsonb,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp with time zone,
    category character varying(30)
);


ALTER TABLE gloria_ops.audit_logs OWNER TO postgres;

--
-- Name: bulk_operation_progress; Type: TABLE; Schema: gloria_ops; Owner: postgres
--

CREATE TABLE gloria_ops.bulk_operation_progress (
    id character varying(36) NOT NULL,
    operation_type character varying(100) NOT NULL,
    status character varying(50) NOT NULL,
    total_items bigint NOT NULL,
    processed_items bigint DEFAULT 0,
    successful_items bigint DEFAULT 0,
    failed_items bigint DEFAULT 0,
    error_details jsonb,
    rollback_data jsonb,
    started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at timestamp with time zone,
    initiated_by character varying(36) NOT NULL,
    metadata jsonb
);


ALTER TABLE gloria_ops.bulk_operation_progress OWNER TO postgres;

--
-- Name: delegations; Type: TABLE; Schema: gloria_ops; Owner: postgres
--

CREATE TABLE gloria_ops.delegations (
    id character varying(36) NOT NULL,
    type character varying(20) NOT NULL,
    delegator_id character varying(36) NOT NULL,
    delegate_id character varying(36) NOT NULL,
    reason text,
    effective_from timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    effective_until timestamp with time zone,
    is_active boolean DEFAULT true,
    context jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    created_by character varying(36)
);


ALTER TABLE gloria_ops.delegations OWNER TO postgres;

--
-- Name: departments; Type: TABLE; Schema: gloria_ops; Owner: postgres
--

CREATE TABLE gloria_ops.departments (
    id character varying(36) NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    school_id character varying(36),
    parent_id character varying(36),
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    created_by character varying(36),
    modified_by character varying(36)
);


ALTER TABLE gloria_ops.departments OWNER TO postgres;

--
-- Name: feature_flag_evaluations; Type: TABLE; Schema: gloria_ops; Owner: postgres
--

CREATE TABLE gloria_ops.feature_flag_evaluations (
    id character varying(36) NOT NULL,
    feature_flag_id character varying(36) NOT NULL,
    user_id character varying(36),
    result boolean NOT NULL,
    reason character varying(255) NOT NULL,
    context jsonb,
    evaluated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE gloria_ops.feature_flag_evaluations OWNER TO postgres;

--
-- Name: feature_flags; Type: TABLE; Schema: gloria_ops; Owner: postgres
--

CREATE TABLE gloria_ops.feature_flags (
    id character varying(36) NOT NULL,
    key character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    type character varying(50) NOT NULL,
    enabled boolean DEFAULT false,
    default_value jsonb,
    rollout_percentage bigint DEFAULT 0,
    conditions jsonb,
    target_users text[],
    target_roles text[],
    target_schools text[],
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    metadata jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    created_by character varying(36)
);


ALTER TABLE gloria_ops.feature_flags OWNER TO postgres;

--
-- Name: module_permissions; Type: TABLE; Schema: gloria_ops; Owner: postgres
--

CREATE TABLE gloria_ops.module_permissions (
    id character varying(36) NOT NULL,
    module_id character varying(36) NOT NULL,
    action character varying(20) NOT NULL,
    scope character varying(20) NOT NULL,
    description text
);


ALTER TABLE gloria_ops.module_permissions OWNER TO postgres;

--
-- Name: modules; Type: TABLE; Schema: gloria_ops; Owner: postgres
--

CREATE TABLE gloria_ops.modules (
    id character varying(36) NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(20) NOT NULL,
    description text,
    icon character varying(50),
    path character varying(255),
    parent_id character varying(36),
    sort_order bigint DEFAULT 0,
    is_active boolean DEFAULT true,
    is_visible boolean DEFAULT true,
    version bigint DEFAULT 0,
    deleted_at timestamp with time zone,
    deleted_by character varying(36),
    delete_reason text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    created_by character varying(36),
    updated_by character varying(36)
);


ALTER TABLE gloria_ops.modules OWNER TO postgres;

--
-- Name: permissions; Type: TABLE; Schema: gloria_ops; Owner: postgres
--

CREATE TABLE gloria_ops.permissions (
    id character varying(36) NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    resource character varying(100) NOT NULL,
    action character varying(20) NOT NULL,
    scope character varying(20),
    conditions jsonb,
    metadata jsonb,
    is_system_permission boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    created_by character varying(36),
    category character varying(20),
    group_icon character varying(50),
    group_name character varying(100),
    group_sort_order bigint DEFAULT 0
);


ALTER TABLE gloria_ops.permissions OWNER TO postgres;

--
-- Name: position_hierarchy; Type: TABLE; Schema: gloria_ops; Owner: postgres
--

CREATE TABLE gloria_ops.position_hierarchy (
    id character varying(36) NOT NULL,
    position_id character varying(36) NOT NULL,
    reports_to_id character varying(36),
    coordinator_id character varying(36)
);


ALTER TABLE gloria_ops.position_hierarchy OWNER TO postgres;

--
-- Name: positions; Type: TABLE; Schema: gloria_ops; Owner: postgres
--

CREATE TABLE gloria_ops.positions (
    id character varying(36) NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    department_id character varying(36),
    school_id character varying(36),
    hierarchy_level bigint NOT NULL,
    max_holders bigint DEFAULT 1,
    is_unique boolean DEFAULT true,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    created_by character varying(36),
    modified_by character varying(36)
);


ALTER TABLE gloria_ops.positions OWNER TO postgres;

--
-- Name: role_hierarchy; Type: TABLE; Schema: gloria_ops; Owner: postgres
--

CREATE TABLE gloria_ops.role_hierarchy (
    id character varying(36) NOT NULL,
    role_id character varying(36) NOT NULL,
    parent_role_id character varying(36) NOT NULL,
    inherit_permissions boolean DEFAULT true,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE gloria_ops.role_hierarchy OWNER TO postgres;

--
-- Name: role_module_access; Type: TABLE; Schema: gloria_ops; Owner: postgres
--

CREATE TABLE gloria_ops.role_module_access (
    id character varying(36) NOT NULL,
    role_id character varying(36) NOT NULL,
    module_id character varying(36) NOT NULL,
    position_id character varying(36),
    permissions jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    created_by character varying(36),
    version bigint DEFAULT 0
);


ALTER TABLE gloria_ops.role_module_access OWNER TO postgres;

--
-- Name: role_permissions; Type: TABLE; Schema: gloria_ops; Owner: postgres
--

CREATE TABLE gloria_ops.role_permissions (
    id character varying(36) NOT NULL,
    role_id character varying(36) NOT NULL,
    permission_id character varying(36) NOT NULL,
    is_granted boolean DEFAULT true,
    conditions jsonb,
    granted_by character varying(36),
    grant_reason text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    effective_from timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    effective_until timestamp with time zone
);


ALTER TABLE gloria_ops.role_permissions OWNER TO postgres;

--
-- Name: roles; Type: TABLE; Schema: gloria_ops; Owner: postgres
--

CREATE TABLE gloria_ops.roles (
    id character varying(36) NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    hierarchy_level bigint NOT NULL,
    is_system_role boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    created_by character varying(36)
);


ALTER TABLE gloria_ops.roles OWNER TO postgres;

--
-- Name: schools; Type: TABLE; Schema: gloria_ops; Owner: postgres
--

CREATE TABLE gloria_ops.schools (
    id character varying(36) NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    lokasi character varying(100),
    address text,
    phone character varying(20),
    email character varying(100),
    principal character varying(255),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    created_by character varying(36),
    modified_by character varying(36)
);


ALTER TABLE gloria_ops.schools OWNER TO postgres;

--
-- Name: system_configurations; Type: TABLE; Schema: gloria_ops; Owner: postgres
--

CREATE TABLE gloria_ops.system_configurations (
    id character varying(36) NOT NULL,
    key character varying(100) NOT NULL,
    value jsonb NOT NULL,
    type character varying(50) NOT NULL,
    category character varying(50) NOT NULL,
    description text,
    is_encrypted boolean DEFAULT false,
    is_public boolean DEFAULT false,
    metadata jsonb,
    validation_rules jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    updated_by character varying(36)
);


ALTER TABLE gloria_ops.system_configurations OWNER TO postgres;

--
-- Name: user_module_access; Type: TABLE; Schema: gloria_ops; Owner: postgres
--

CREATE TABLE gloria_ops.user_module_access (
    id character varying(36) NOT NULL,
    user_profile_id character varying(36) NOT NULL,
    module_id character varying(36) NOT NULL,
    permissions jsonb NOT NULL,
    granted_by character varying(36) NOT NULL,
    reason text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    version bigint DEFAULT 0,
    effective_from timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    effective_until timestamp with time zone
);


ALTER TABLE gloria_ops.user_module_access OWNER TO postgres;

--
-- Name: user_permissions; Type: TABLE; Schema: gloria_ops; Owner: postgres
--

CREATE TABLE gloria_ops.user_permissions (
    id character varying(36) NOT NULL,
    user_profile_id character varying(36) NOT NULL,
    permission_id character varying(36) NOT NULL,
    is_granted boolean DEFAULT true,
    conditions jsonb,
    granted_by character varying(36) NOT NULL,
    grant_reason text NOT NULL,
    priority bigint DEFAULT 100,
    is_temporary boolean DEFAULT false,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    resource_id character varying(36),
    resource_type character varying(50),
    effective_from timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    effective_until timestamp with time zone
);


ALTER TABLE gloria_ops.user_permissions OWNER TO postgres;

--
-- Name: user_positions; Type: TABLE; Schema: gloria_ops; Owner: postgres
--

CREATE TABLE gloria_ops.user_positions (
    id character varying(36) NOT NULL,
    user_profile_id character varying(36) NOT NULL,
    position_id character varying(36) NOT NULL,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone,
    is_active boolean DEFAULT true,
    is_plt boolean DEFAULT false,
    appointed_by character varying(36),
    sk_number character varying(100),
    notes text,
    permission_scope character varying(50),
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE gloria_ops.user_positions OWNER TO postgres;

--
-- Name: user_profiles; Type: TABLE; Schema: gloria_ops; Owner: postgres
--

CREATE TABLE gloria_ops.user_profiles (
    id character varying(36) NOT NULL,
    clerk_user_id character varying(100) NOT NULL,
    nip character varying(15) NOT NULL,
    is_active boolean DEFAULT true,
    last_active timestamp with time zone,
    preferences jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    created_by character varying(36)
);


ALTER TABLE gloria_ops.user_profiles OWNER TO postgres;

--
-- Name: user_roles; Type: TABLE; Schema: gloria_ops; Owner: postgres
--

CREATE TABLE gloria_ops.user_roles (
    id character varying(36) NOT NULL,
    user_profile_id character varying(36) NOT NULL,
    role_id character varying(36) NOT NULL,
    assigned_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    assigned_by character varying(36),
    is_active boolean DEFAULT true,
    effective_from timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    effective_until timestamp with time zone
);


ALTER TABLE gloria_ops.user_roles OWNER TO postgres;

--
-- Name: workflow; Type: TABLE; Schema: gloria_ops; Owner: postgres
--

CREATE TABLE gloria_ops.workflow (
    id character varying(36) NOT NULL,
    request_id character varying(255) NOT NULL,
    workflow_type character varying(100) NOT NULL,
    status character varying(50) NOT NULL,
    initiator_id character varying(255),
    temporal_workflow_id character varying(255),
    temporal_run_id character varying(255),
    metadata jsonb,
    started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone
);


ALTER TABLE gloria_ops.workflow OWNER TO postgres;

--
-- Data for Name: data_karyawan; Type: TABLE DATA; Schema: gloria_master; Owner: postgres
--

COPY gloria_master.data_karyawan (nip, nama, jenis_kelamin, tgl_mulai_bekerja, tgl_tetap, status, waktu_kerja_kependidikan, bagian_kerja, lokasi, bidang_kerja, jenis_karyawan, status_aktif, no_ponsel, email, birthdate, rfid) FROM stdin;
000025	LIM TIEN (PGTK1) 	P	2001-01-08 00:00:00+07	\N	Menikah	FULL TIME	PGTK1	Pacar	KEPALA SEKOLAH	GURU	Aktif	08165436639	liem_tien@gloriaschool.org	1976-12-02 00:00:00+07	DF  48  0C  E6
001457	CONNIE TANONE (SMP3) 	P	2021-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP3	Grand Pakuwon	KEPALA SEKOLAH	GURU	Aktif	082132533388	connie_tanone@gloriaschool.org	1981-03-16 00:00:00+07	DF  F1  0E  E6
00411	SAI DONG	L	2013-08-01 00:00:00+07	\N	Menikah	HONORER	SD3	Pakuwon City	GURU	GURU	Tidak	\N	\N	1969-08-16 00:00:00+07	\N
01494	DOLOROSA SINTA GRACE NANDA	P	2021-09-27 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	085748113009	dolorosa_nanda@gloriaschool.org	1998-06-22 00:00:00+07	DF  59  18  E6
00624	FRIDA TANIAGO	P	2013-01-07 00:00:00+07	\N	Lajang	HONORER	SMA2	Pakuwon City	GURU	GURU	Tidak	08175055509	\N	1994-05-20 00:00:00+07	\N
00734	PRAVIN MADHUKAR DONGARDIVE	L	2014-02-15 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	KURIKULUM SMP-SMA	KARYAWAN	Tidak	\N	\N	1963-12-27 00:00:00+07:30	\N
00349	APRIL SUPRIYONO	L	1998-03-01 00:00:00+07	\N	Menikah	FULL TIME	SATPAM	Kupang Indah	SECURITY	KARYAWAN	Tidak	\N	aprilsupriyono0@gmail.com	1969-04-02 00:00:00+07	\N
00608	GABRIELLA POPPYLITA SOEMARTONO	P	2012-11-26 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	TATA USAHA	KARYAWAN	Tidak	081912335656	\N	1990-06-09 00:00:00+07	\N
80018	ALBERT BUDIYANTO EKO PUTRO	L	2025-07-01 00:00:00+07	\N	Menikah	-	SMP2	Pakuwon City	NON PEGAWAI	NON PEGAWAI	Aktif	\N	albertbudiyanto@gmail.com	1983-07-31 00:00:00+07	\N
00843	JESSICA	P	2015-02-23 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	BIMBINGAN/KONSELING	GURU	Tidak	085641470997	\N	1986-01-23 00:00:00+07	\N
01071	DEMITRIA DINI ARIYANI	P	2016-09-29 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	085252055483	\N	1993-04-10 00:00:00+07	\N
01657	PURBO SUTANTO	L	2024-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	082330810988	purbo_sutanto@gloriaschool.org	1982-09-09 00:00:00+07	5F  19  18  E6
01631	ANDRE BATISTUTA SUBYAKTO	L	2024-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	081389018830	andre_subyakto@gloriaschool.org	1995-01-05 00:00:00+07	3F  A6  16  E6
01738	PRINSIPESSIA PUTRI ABIGAIL LOLONG	P	2025-09-03 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Aktif	081334399486	prinsipessia_lolong@gloriaschool.org	2000-06-06 00:00:00+07	\N
00807	SAMUEL YUNIUS SAYOGA	L	2014-08-11 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	082327354094	\N	1984-06-26 00:00:00+07	\N
00609	GLORIA TRIKARUNIA SURYANINGSIH	P	2013-01-04 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	TATA USAHA	KARYAWAN	Aktif	085730368379	gloria_suryaningsih@gloriaschool.org	1987-10-07 00:00:00+07	5F  BD  0E  E6
01498	FEBE LEONORA AGUNG	P	2021-11-15 00:00:00+07	\N	Lajang	PART TIME	SD1	Pacar	GURU	GURU	Tidak	081330058507	febe_agung@gloriaschool.org	1999-08-16 00:00:00+07	\N
00542	YOVITA MARIA KRISTINA	P	2012-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	085732242881	yovita_maria@gloriaschool.org	1989-08-09 00:00:00+07	9F  59  18  E6
00468	HANA	P	2011-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	081533771384	\N	1977-09-15 00:00:00+07	\N
01307	YOSHUA BUDYHARDJO	L	2019-02-15 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	BIMBINGAN/KONSELING	GURU	Aktif	085102314450	yoshua_budyhardjo@gloriaschool.org	1997-01-23 00:00:00+07	1F  F6  13  E6
00090	ELISA SUSANTI RUMBON	P	2007-09-07 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	082231346964	\N	1980-04-14 00:00:00+07	\N
01486	GUSTI ADITYA	L	2021-08-01 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	081336032947	gusti_aditya@gloriaschool.org	1987-08-07 00:00:00+07	9F  D7  0E  E6
01408	P. TRI NURCAHYO	L	2020-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	082232174940	tri_nurcahyo@gloriaschool.org	1984-06-12 00:00:00+07	DF  14  17  E6
00585	TAN CALVIN SUTANTO	L	2012-09-24 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	IT	KARYAWAN	Tidak	08385556796	\N	1990-11-30 00:00:00+07	\N
00327	MINAYAH	P	1999-07-15 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	KANTIN	KARYAWAN	Aktif	\N	minayahmin1973@gmail.com	1973-07-06 00:00:00+07	\N
00635	NANDESHA NENSIA DWI CRISTANTI	P	2013-04-03 00:00:00+07	\N	Lajang	HONORER	SD2	Kupang Indah	GURU	GURU	Tidak	08175257770	\N	1988-09-01 00:00:00+07	\N
00632	ALEXANDER TIKSNA FEBRIASTO, SE	L	2013-04-01 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	TATA USAHA	KARYAWAN	Aktif	0817395906	alexander_febriasto@gloriaschool.org	1978-02-25 00:00:00+07	FF  A6  0B  E6
00869	ANDRE MAKMUR	L	2015-05-04 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	081703883886	\N	1992-11-21 00:00:00+07	\N
00205	NANETTA PULIH ERISETYANI	P	2010-01-14 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	\N	\N	1986-01-06 00:00:00+07	\N
00758	RATNA ANGGRAINI	P	2014-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	082143324487	ratna_anggraini@gloriaschool.org	1987-12-07 00:00:00+07	\N
00640	YULANDA	P	2013-04-02 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	BIMBINGAN/KONSELING	GURU	Tidak	085659812838	\N	1990-01-20 00:00:00+07	\N
80038	NATALIA MANDIRIANI	P	2025-08-25 00:00:00+07	\N	Lajang	-	SMA2	Pakuwon City	NON PEGAWAI	NON PEGAWAI	Aktif	082244457237	nataliamandiriani@gmail.com	1995-12-18 00:00:00+07	\N
00253	ROBIN YULIO	L	2007-07-10 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	08121751595	robin_yulio@gloriaschool.org	1980-07-26 00:00:00+07	5F  93  17  E6
00894	ROBI DHARMAWAN	L	2015-07-03 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	089677561786	robi_dharmawan@gloriaschool.org	1987-05-15 00:00:00+07	3F  C0  13  E6
01733	JESSICA TANEKE	P	2025-07-15 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	081218693615	jessica_taneke@gloriaschool.org	1997-01-23 00:00:00+07	FF  BB  17  E6
00386	HADI SUSANTO SINATRA	L	2007-07-02 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	HR	KARYAWAN	Tidak	08155001366	\N	1981-06-30 00:00:00+07	\N
01576	OKTAVIANUS YERI KRISTIAWAN	L	2023-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	\N	oktavianus_kristiawan@gloriaschool.org	1992-10-24 00:00:00+07	1F  40  15  E6
00931	LILYANA CENDRAWATI	P	2015-07-03 00:00:00+07	\N	Menikah	PART TIME	SD1	Pacar	GURU	GURU	Tidak	081938141240	\N	1949-08-17 00:00:00+08	\N
01111	KRISWINHARSELL SURYA SANGKAKALA	L	2017-05-12 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	BIMBINGAN/KONSELING	GURU	Tidak	081299191486	\N	1991-07-30 00:00:00+07	\N
00275	DESY ERLINA	P	2008-08-06 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	085655358376	desy_erlina@gloriaschool.org	1983-12-31 00:00:00+07	BF  AF  0C  E6
80011	SAI DONG, , SM.TH, S.PSI	L	2025-07-01 00:00:00+07	\N	Menikah	-	SMP1	Kupang Indah	NON PEGAWAI	NON PEGAWAI	Tidak	08123195912	coachdong123@gmail.com	1969-08-16 00:00:00+07	\N
01148	ENGGA WAHYU ARDANA SARI	P	2017-08-21 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	081233932462	\N	1991-06-16 00:00:00+07	\N
01088	YOGI DIAN KURNIAWAN	L	2017-02-03 00:00:00+07	\N	Lajang	HONORER	SMP1	Kupang Indah	GURU	GURU	Tidak	087701641311	\N	1988-09-03 00:00:00+07	\N
01084	SILVANA CHARLA SUAWAH	P	2017-01-03 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	KEPALA SEKOLAH	GURU	Tidak	081357601700	silvana_charla@gloriaschool.org	1978-08-23 00:00:00+07	\N
00934	DESY AYU NATALIA	P	2015-08-24 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	TATA USAHA	KARYAWAN	Aktif	085330864804	desy_natalia@gloriaschool.org	1992-12-19 00:00:00+07	1F  4E  12  E6
00668	RUTH PRINCES JULIANA PARDEDE	P	2013-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK1	Pacar	TATA USAHA	KARYAWAN	Tidak	082364916911	\N	1986-07-11 00:00:00+07	\N
01250	KEZIA ANGELICA EFENDY	P	2018-10-22 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	082332150403	kezia_angelica@gloriaschool.org	1996-03-15 00:00:00+07	BF  97  10  E6
00899	PAULUS PURBA	L	2015-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	#N/A	GURU	GURU	Tidak	082331678271	\N	1987-06-30 00:00:00+07	\N
01480	JESSICA NOVIA NILOWARSO	P	2021-08-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	08113540950	jessica_nilowarso@gloriaschool.org	1996-01-28 00:00:00+07	\N
01258	YOHANNA TANNIA	P	2019-01-03 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	08980450048	yohanna_tania@gloriaschool.org	1993-10-26 00:00:00+07	\N
01448	YOGI DIAN KURNIAWAN	L	2021-02-03 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	089660574091	yogi_kurniawan@gloriaschool.org	1988-09-03 00:00:00+07	FF  75  0E  E6
00633	LOKA ONGKODJOJO	L	2013-01-16 00:00:00+07	\N	Menikah	HONORER	SMP1	Kupang Indah	GURU	GURU	Tidak	089634002554	\N	1968-03-22 00:00:00+07	\N
00629	DINA NAOMI	P	2013-02-20 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	TATA USAHA	KARYAWAN	Tidak	081554480041	\N	1977-10-28 00:00:00+07	\N
01226	STEPHANIE SANTOSO	P	2018-07-11 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	087875556367	\N	1993-09-24 00:00:00+07	\N
01565	MICHELLE PHONDA, S.DS.	P	2023-02-01 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	087752895323	michelle_phonda@gloriaschool.org	1994-08-20 00:00:00+07	\N
01653	AYU SAEPUTRI TURNIP	P	2024-07-08 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	KURIKULUM KBTK-SD	KARYAWAN	Tidak	085261520859	ayu_turnip@gloriaschool.org	1997-07-28 00:00:00+07	\N
00602	YOTAM HEZRON	L	2012-10-01 00:00:00+07	\N	Menikah	HONORER	SMA2	Pakuwon City	GURU	GURU	Tidak	085784441077	\N	1976-11-07 00:00:00+07	\N
01736	TANIA GISSELA SUSILO	P	2025-12-08 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	KURIKULUM KBTK-SD	KARYAWAN	Aktif	082140374619	\N	2002-01-20 00:00:00+07	\N
00372	MERCYAN NOVENTIS	L	2005-08-01 00:00:00+07	\N	Menikah	FULL TIME	UMUM	Kupang Indah	TEKNISI	KARYAWAN	Tidak	08563303995	\N	1979-11-12 00:00:00+07	\N
01416	FIORENTINA AGUSTIN	P	2020-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	082199137200	fiorentina_agustin@gloriaschool.org	1998-08-03 00:00:00+07	\N
00329	MUJIHARTI	P	1997-09-15 00:00:00+07	\N	Menikah	FULL TIME	UMUM	Kupang Indah	KANTIN	KARYAWAN	Tidak	087752194949	\N	1963-07-01 00:00:00+07:30	\N
00856	ELFRITA SANTY SITOMPUL	P	2015-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Aktif	081312443800	elfrita_santy@gloriaschool.org	1984-05-09 00:00:00+07	7F  7D  16  E6
00961	IRENE LISTIANI, S.PD	P	2016-01-11 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	082244482915	irene_listiani@gloriaschool.org	1982-08-15 00:00:00+07	\N
01021	SAMUEL LESMANA	L	2016-07-14 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	081252667757	samuel_lesmana@gloriaschool.org	1979-03-21 00:00:00+07	BF  48  0E  E6
01146	SAI DONG,,SM.TH, S.PSI	L	2017-08-04 00:00:00+07	\N	Menikah	HONORER	SMP1	Kupang Indah	GURU	GURU	Tidak	08123195912	coachdong123@gmail.com	1969-08-16 00:00:00+07	\N
00582	YOAS YOSIA KRISTIANTO	L	2012-08-01 00:00:00+07	\N	Lajang	HONORER	SMP2	Pakuwon City	GURU	GURU	Tidak	085646971456	\N	1993-03-20 00:00:00+07	\N
00975	RENDY BROS TITO	L	2016-04-01 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	082313230732	rendy_bros@gloriaschool.org	1992-06-25 00:00:00+07	\N
01529	JENNIFER GRACIA	P	2022-09-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	PERPUSTAKAAN	KARYAWAN	Aktif	081289390004	jennifer_gracia@gloriaschool.org	1994-06-10 00:00:00+07	DF  7E  17  E6
00666	PUSPITA NUGRAHA WIBISONO	P	2013-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	081332598845	puspita_nugraha@gloriaschool.org	1991-05-12 00:00:00+07	\N
00962	NEHEMIA DUTA PRASETYO LIUNESI	L	2016-02-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	081230930436	\N	1989-10-02 00:00:00+07	\N
01731	GRACE RIAN CHRISSHITA DEWI	P	2025-07-07 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	TATA USAHA	KARYAWAN	Aktif	081553546995	grace_dewi@gloriaschool.org	1999-01-03 00:00:00+07	DF  55  17  E6
01166	JESSICA AGRIPINA	P	2017-11-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	GA	KARYAWAN	Tidak	081230410877	jessica_agripina@gloriaschool.org	1993-12-07 00:00:00+07	\N
01301	BAYU EKO SUTRISNO	L	2019-02-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	085729578592	bayu_sutrisno@gloriaschool.org	1992-11-26 00:00:00+07	DF  CB  10  E6
01606	SERLINDA TENDEN TURANGAN	P	2023-08-15 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	081244739861	serlinda_turangan@gloriaschool.org	1997-09-07 00:00:00+07	\N
00860	ELISAFAT BUULOLO	L	2015-04-16 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	082132463711	elisafat_buulolo@gloriaschool.org	1991-03-30 00:00:00+07	BF  02  11  E6
01527	SRI INDAYANI	P	2022-06-25 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	TATA USAHA	KARYAWAN	Tidak	\N	sri_indayani@gloriaschool.org	1967-06-24 00:00:00+07	\N
01143	ELLIS Y	P	2017-08-01 00:00:00+07	\N	Menikah	HONORER	SD3	Pakuwon City	GURU	GURU	Tidak	081231998075	\N	1978-10-28 00:00:00+07	\N
00284	FX. ERWAN PRASETYO	L	1999-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	\N	fx_erwan@gloriaschool.org	1971-02-27 00:00:00+07	9F  80  0D  E6
01134	MUTIARA ARUM KUSUMANINGATI	P	2017-07-11 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	08175084511	\N	1991-08-10 00:00:00+07	\N
01662	MANUELLA LOVENSA DELFARONA MUSKITTA	P	2024-07-08 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Aktif	088223988879	manuella_delfarona@gloriaschool.org	1992-06-23 00:00:00+07	BF  B1  0D  E6
00030	WAGIYO, SPD	L	1995-06-15 00:00:00+07	\N	Menikah	FULL TIME	SD1	Pacar	GURU	GURU	Aktif	081331815495	petrus_wagiyo@gloriaschool.org	1967-03-15 00:00:00+07	1F  5C  0F  E6
01587	HOSEA SUMALI	L	2023-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	085234025084	hosea_sumali@gloriaschool.org	1997-09-06 00:00:00+07	\N
00982	CITRA LIDYA PANTOW	P	2016-04-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	082188539072	\N	1988-10-10 00:00:00+07	\N
00507	DENNY WIRAWAN HENDRIYADI	L	2012-01-09 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Aktif	081931054268	denny_wirawan@gloriaschool.org	1988-12-03 00:00:00+07	3F  DB  0C  E6
01737	DELISA ANDREAS	P	2025-10-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	AKUNTING	KARYAWAN	Aktif	087854539567	delisa_andreas@gloriaschool.org	1993-08-09 00:00:00+07	25  57  48  B1
01575	SULISETIO INDAHWATI	P	2023-05-02 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Aktif	081233419661	sulisetio_indahwati@gloriaschool.org	1989-05-12 00:00:00+07	3F  39  0D  E6
00798	Y. ARSADEWA	L	2014-08-06 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	KURIKULUM KBTK-SD	KARYAWAN	Aktif	085790361470	yohanes_arsadewa@gloriaschool.org	1992-06-25 00:00:00+07	BF  72  15  E6
01667	VALERIE PUTRI	P	2024-07-08 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	082228865688	valerie_putri@gloriaschool.org	2001-11-18 00:00:00+07	7F  8B  13  E6
01049	YOEDANTORO ALEXANDER DANIEL	L	2016-08-01 00:00:00+07	\N	Menikah	HONORER	SD2	Kupang Indah	GURU	GURU	Tidak	089639752399	\N	1951-06-18 00:00:00+07:30	\N
00765	MORIB MARGERITA GLORIA	P	2014-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	081333130522	morib_margareta@gloriaschool.org	1986-03-09 00:00:00+07	FF  E2  17  E6
00549	INDRAWATI	P	2012-07-02 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	TATA USAHA	KARYAWAN	Tidak	085731886460	\N	1988-06-29 11:19:37+07	\N
00272	DAMARIS URI MAISARAH, SH, MA	P	2009-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	\N	\N	1976-04-19 00:00:00+07	\N
01724	BILLY KURNIAWAN LUKITO	L	2025-07-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Aktif	895401007107	billy_lukito@gloriaschool.org	2002-09-18 00:00:00+07	DF  FE  16  E6
00479	MEGA ANGELA	P	2011-08-11 00:00:00+07	\N	TBA	PART TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	081703180108	\N	1988-08-11 00:00:00+07	\N
00068	SIH WINARMI	P	2004-03-15 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	PERPUSTAKAAN	KARYAWAN	Aktif	081331333084	sih_winarmi@gloriaschool.org	1981-08-23 00:00:00+07	FF  E7  16  E6
01591	YOHANES DWI NUGROHO	L	2023-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	82147439515	yohanes_nugroho@gloriaschool.org	1995-01-17 00:00:00+07	\N
00036	SUWISMIASRI SAPTIANI	P	2010-08-12 00:00:00+07	\N	Menikah	FULL TIME	PGTK1	Pacar	GURU	GURU	Aktif	08155508448	suwismiasri_saptiani@gloriaschool.org	1978-10-26 00:00:00+07	5F  E1  0F  E6
00654	TANIA PARAMITA THENADY	P	2013-04-19 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	081330030091	\N	1991-03-13 00:00:00+07	\N
01450	LYDIA NATALIA HALIM	P	2021-03-15 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	TATA USAHA	KARYAWAN	Aktif	081703040685	lydia_natalia@gloriaschool.org	1994-12-04 00:00:00+07	9F  1F  16  E6
01104	YOHANES WELFRED PRAJOGO	L	2017-02-04 00:00:00+07	\N	Lajang	HONORER	SMP2	Pakuwon City	GURU	GURU	Tidak	0818376189	yohaneswelfred@gmail.com	1981-07-25 00:00:00+07	\N
00890	IKA LILYANA SOESILO	P	2015-07-01 00:00:00+07	\N	Lajang	PART TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	089662763089	\N	1989-08-12 00:00:00+07	\N
01580	PRISCA OCTAVIA	P	2023-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	BIMBINGAN/KONSELING	GURU	Aktif	085725281027	prisca_octavia@gloriaschool.org	1990-10-29 00:00:00+07	3F  91  16  E6
00952	ERWIN PRASETYA	L	2015-09-17 00:00:00+07	\N	Lajang	HONORER	SMA2	Pakuwon City	GURU	GURU	Tidak	08997233002	\N	1993-06-25 00:00:00+07	\N
00285	HENGKY BAMBANG	L	2010-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	08155100055	\N	1986-10-17 00:00:00+07	\N
01649	CANDRA WULANSARI	P	2024-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	085773903938	candra_wulansari@gloriaschool.org	1989-11-27 00:00:00+07	DF  37  16  E6
00730	ABI KRIDA PRASTYA	L	2014-01-06 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	082226189913	abi_krida@gloriaschool.org	1988-04-13 00:00:00+07	\N
00591	MEGA PUTRI HARDINI	P	2012-10-16 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	WAKIL KEPALA SEKOLAH	GURU	Aktif	085641139069	mega_putri@gloriaschool.org	1990-05-09 00:00:00+07	9F  FA  11  E6
00494	FIRGISTYA SUKMADINI	P	2011-10-04 00:00:00+07	\N	TBA	FULL TIME	SD3	Pakuwon City	TATA USAHA	KARYAWAN	Tidak	\N	\N	1987-09-02 13:25:02+07	\N
00297	PETRUS CHANDRA, S.PD	L	2007-02-01 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	\N	\N	1978-12-17 00:00:00+07	\N
01373	HOWARD MUNADI TUMANGGOR ST	L	2019-09-02 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	GA	KARYAWAN	Tidak	\N	\N	1984-08-29 00:00:00+07	\N
01325	KHOE EVA INDAH MEILIAWATI K.	P	2019-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	081230562857	\N	1993-05-04 00:00:00+07	\N
00911	ANTONIUS ARI SUKMA HARDIANA	L	2015-07-08 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	085790217537	\N	1985-05-02 00:00:00+07	\N
01031	MARTHA BENITA TEDJO	P	2016-07-14 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	OPERASIONAL KBTK-SD	KARYAWAN	Aktif	08175140961	martha_benita@gloriaschool.org	1991-05-21 00:00:00+07	DF  F5  13  E6
00644	JOHANNES UBAD BARUS	L	2013-04-02 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	GA	KARYAWAN	Tidak	0815400559900	\N	1990-10-29 00:00:00+07	\N
00114	SHANTI HERMAWAN	P	2009-05-18 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	\N	\N	1983-09-13 00:00:00+07	\N
00736	VANIA MARCELLI GUNAWAN	P	2014-01-06 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Tidak	082332349720	\N	1991-03-11 00:00:00+07	\N
01431	APRILIA ALBERTINE	P	2020-07-20 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	081334277391	aprilia_albertine@gloriaschool.org	1998-04-12 00:00:00+07	\N
00920	ELIA FEMMY POSSUMAH	P	2015-08-03 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	SUSTER	KARYAWAN	Tidak	082231393659	Eliafemmy73@gmail.com	1996-02-09 00:00:00+07	\N
01577	STEFANNY LOIS YOLIVIA	P	2023-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	PERPUSTAKAAN	KARYAWAN	Aktif	085791152958	stefanny_yolivia@gloriaschool.org	2000-11-18 00:00:00+07	BF  4F  16  E6
01211	NOVI KURNIADI	P	2018-07-02 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	KEPALA SEKOLAH	GURU	Aktif	08877338526	novi_kurniadi@gloriaschool.org	1990-11-12 00:00:00+07	9F  5C  0B  E6
01683	ATENG SUGIJANTO	L	2024-12-07 00:00:00+07	\N	Menikah	PART TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	087833380066	ateng_sugijanto@gloriaschool.org	1968-04-26 00:00:00+07	\N
00849	RENDY RYLE ALVIANDA PUTRA SELAWA	L	2015-03-02 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	082244373401	\N	1992-11-26 00:00:00+07	\N
01005	ANDRIANA JESSICASARI	P	2016-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	085732397473	andriana_jesicasari@gloriaschool.org	1992-11-09 00:00:00+07	7F  59  18  E6
01557	VALENTINO FERDINAND TAROREH	L	2023-01-03 00:00:00+07	\N	Lajang	HONORER	SMP2	Pakuwon City	GURU	GURU	Tidak	081282648724	tino.futsal13@gmail.com	1988-02-18 00:00:00+07	\N
01000	V. EKO LANGGENG BAYU WIDODO	L	2016-06-13 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	GA	KARYAWAN	Tidak	081232077386	\N	1982-09-12 00:00:00+07	\N
00862	YOHANES SAPUTRA	L	2015-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	081230392569	yohanes_saputra@gloriaschool.org	1987-05-13 00:00:00+07	BF  CF  17  E6
00098	ISLIANA RUKMININGSIH. SSI	P	2010-08-01 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	\N	isliana_rukminingsih@gloriaschool.org	1982-07-01 00:00:00+07	3F  33  10  E6
01680	LAURENCIA VIOLITTA	P	2024-12-02 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	TATA USAHA	KARYAWAN	Aktif	082257617102	laurencia_violitta@gloriaschool.org	1993-02-01 00:00:00+07	FF  39  13  E6
01433	RIFKALIANA JIMMY BERLIANI	P	2020-07-22 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	089663344594	rifkaliana_berliani@gloriaschool.org	1998-01-04 00:00:00+07	9F  A5  13  E6
00811	CARINA TRISNOWATI	P	2014-08-15 00:00:00+07	\N	Lajang	PART TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	085730868588	\N	1991-10-09 00:00:00+07	\N
01318	ANGGITA CHRISTINA SUNARTO PUTRI	P	2019-04-01 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	IT	KARYAWAN	Tidak	081231906962	anggita_putri@gloriaschool.org	1997-07-12 00:00:00+07	\N
00004	ATHENA CONNY JUWITA	P	2009-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD1	Pacar	BIMBINGAN/KONSELING	GURU	Tidak	08315883229	\N	1986-07-10 00:00:00+07	\N
00405	WIDYASTUTI OETOMO	P	2002-09-26 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	UNIT USAHA	KARYAWAN	Aktif	081331629920	wiwid_oetomo@gloriaschool.org	1976-08-21 00:00:00+07	3F  5C  0B  E6
00184	CHRISTIAN ARIWIBOWO	L	2003-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Aktif	08123017893	christian_ariwibowo@gloriaschool.org	1971-12-10 00:00:00+07	1F  AA  14  E6
00136	EPIPHANIAS HUTAHURUK	P	2009-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	08983958065	\N	1978-01-08 00:00:00+07	\N
00116	VERAWATI KUSUMOHARDJO	P	2008-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	WAKIL KEPALA SEKOLAH	GURU	Tidak	08123296168	\N	1979-09-12 00:00:00+07	\N
00537	MARLIN NIPI	P	2012-07-02 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	085242583310	\N	1983-08-13 00:00:00+07	\N
00112	REFIANA KHRISTIAWATI	P	2009-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	08175130600	refiana_khristiawati@gloriaschool.org	1978-09-13 00:00:00+07	BF  D1  16  E6
01103	DAVID SANTOSO KOSASIH	L	2017-04-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	KOORDINATOR	KARYAWAN	Tidak	08123520979	david_santoso@gloriaschool.org	1970-10-22 00:00:00+07	\N
01003	THE AGNES ANGELITA SETIADI	P	2016-06-16 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	SEKRETARIS	KARYAWAN	Aktif	087855162311	agnes_angelita@gloriaschool.org	1994-09-19 00:00:00+07	7F  EE  15  E6
01670	AMANDA AMENUELLA RAHARJA	P	2024-07-25 00:00:00+07	\N	Lajang	FULL TIME	SD4	Grand Pakuwon	BIMBINGAN/KONSELING	GURU	Aktif	082131284242	amanda_raharja@gloriaschool.org	2001-03-27 00:00:00+07	BF  17  10  E6
00697	BENEDIKTUS JANUARIUS	L	2013-08-01 00:00:00+07	\N	Menikah	HONORER	SMP2	Pakuwon City	GURU	GURU	Tidak	082132267935	\N	1977-01-26 00:00:00+07	\N
01688	LINDA BUNTORO	P	2025-02-28 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	KEPALA SEKOLAH	GURU	Aktif	0819807703	linda_buntoro@gloriaschool.org	1965-01-28 00:00:00+07	7F  61  14  E6
80027	KRISTIANTO EKO SAPUTRO	L	2025-07-01 00:00:00+07	\N	Lajang	-	SMA2	Pakuwon City	NON PEGAWAI	NON PEGAWAI	Aktif	081216720682	christiansaputra749@gmail.com	1991-04-07 00:00:00+07	\N
00396	ONIS SIMUS MOSOOLI	L	1998-08-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	KOORDINATOR	KARYAWAN	Tidak	\N	\N	1953-08-08 00:00:00+07:30	\N
80007	ADRENG DJURIT PAMUNGKAS	L	2025-07-01 00:00:00+07	\N	Menikah	-	SD2	Kupang Indah	NON PEGAWAI	NON PEGAWAI	Aktif	081246408524	adp_jc.rockon@yahoo.co.id	1986-10-20 00:00:00+07	\N
01400	GIDION BAGUS IMANUEL	L	2020-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	083866926168	gidion_imanuel@gloriaschool.org	1990-04-12 00:00:00+07	\N
00046	CHRISTINE ADRIANA POLI	P	2010-03-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	BIMBINGAN/KONSELING	GURU	Aktif	08175193908	christine_adriana@gloriaschool.org	1982-12-14 00:00:00+07	BF  16  12  E6
01717	YULIYANTO CHANDRA	L	2025-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	08113224610	yuliyanto_chandra@gloriaschool.org	1996-08-16 00:00:00+07	FF  37  16  E6
00826	DEBORAH NURDIYANTI	P	2014-09-15 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	SUSTER	KARYAWAN	Tidak	085708918922	\N	1994-03-10 00:00:00+07	\N
00061	MEGAWATI KRISNADEWI	P	2010-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	TATA USAHA	KARYAWAN	Aktif	08563093310	megawati_krisnadewi@gloriaschool.org	1976-05-25 00:00:00+07	DF  AF  0C  E6
00265	AGUS SALIM SUTANTO	L	2010-07-07 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	\N	\N	1983-08-15 00:00:00+07	\N
00694	MARIA GRACE SILIA MONIKA SARI	P	2013-07-30 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	08216575967	\N	1990-07-17 00:00:00+07	\N
00308	DIDIN ARIYANTO	L	2002-09-15 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Pacar	UMUM	KARYAWAN	Aktif	085746224476	alifyusufalmisri@gmail.com	1984-04-01 00:00:00+07	\N
00972	LINDAWATI	P	2016-04-01 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	089653129728	\N	1986-02-14 00:00:00+07	\N
00395	MARIA SANTI R	P	2004-08-18 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	LOGISTIK	KARYAWAN	Tidak	\N	\N	1971-12-15 00:00:00+07	\N
00751	LUKAS HARIADI	L	2014-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	087877805118	\N	1991-08-06 00:00:00+07	\N
01114	PADI	L	2017-07-03 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	087851343813	padi@gloriaschool.org	1980-01-07 00:00:00+07	\N
01636	MICHELLE KOSASIH	P	2024-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	089690777025	michelle_kosasih@gloriaschool.org	1998-08-31 00:00:00+07	\N
00919	PETRUS CHANDRA	L	2015-07-27 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	082234010117	\N	1978-12-17 00:00:00+07	\N
00389	JOHANES GUALBERTUS HENDRA	L	2004-04-15 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	PEMBELIAN	KARYAWAN	Tidak	\N	\N	1974-07-18 00:00:00+07	\N
01464	FEBE EKA WIDARMA	P	2021-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	081244765834	febe_widarma@gloriaschool.org	1997-02-06 00:00:00+07	BF  2A  17  E6
00392	LIDIA WULANDARI	P	1986-07-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Pacar	UNIT USAHA	KARYAWAN	Tidak	0818502858	lidia_wulandari@gloriaschool.org	1965-09-08 00:00:00+07	\N
01522	SHIWI TIEFHANNY TAKA	P	2022-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	085211442318	shiwi_taka@gloriaschool.org	1998-02-09 00:00:00+07	\N
01191	KEZIA SOLA GRATIA	P	2018-03-15 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	087859553307	kezia_sola@gloriaschool.org	1994-11-25 00:00:00+07	\N
00912	ASTRA BELINDA	P	2015-08-01 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	082132332022	astra_belinda@gloriaschool.org	1994-04-25 00:00:00+07	5F  B0  0C  E6
01203	CHRISTA AZALIA TEDJORAHARDJO	P	2018-07-02 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	085749166595	christa_azalia@gloriaschool.org	1995-11-12 00:00:00+07	\N
01160	BASANA ROTUA SIPAHUTAR	P	2017-10-02 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	081384450997	\N	1972-05-13 00:00:00+07	\N
00699	PAULINA HANI RUSMAWATI	P	2013-08-15 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	085291169308	\N	1990-05-08 00:00:00+07	\N
00508	HENNY ROSSALINA INDAH PUSPITA HARRANTO	P	2012-01-13 00:00:00+07	\N	Lajang	PART TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	081703700003	\N	1988-06-15 00:00:00+07	\N
01056	CHIN TJIN SUANG ALS. ZHAO JIN SHUAN	P	2016-08-05 00:00:00+07	\N	Lajang	HONORER	SD3	Pakuwon City	GURU	GURU	Tidak	082245186212	\N	1967-12-12 00:00:00+07	\N
01472	SISWANTI REWAI	P	2021-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	085395852762	siswanti_rewai@gloriaschool.org	1996-03-01 00:00:00+07	\N
01326	FELITA STEFANIE LIANTO WIJAYA	P	2019-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	082132106844	felita_wijaya@gloriaschool.org	1997-09-29 00:00:00+07	DF  4E  10  E6
01730	RISTO GEROL FOEKH	L	2025-07-01 00:00:00+07	\N	Menikah	PART TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	081249225265	risto_foekh@gloriaschool.org	1991-05-24 00:00:00+07	\N
00880	MAGGIE FLORENSIA GOZALLY	P	2015-07-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	082131709012	\N	1991-04-08 00:00:00+07	\N
00119	WIDI RETNO PALUPI	P	2009-01-05 09:53:02+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	08563352406	widi_retno@gloriaschool.org	1984-03-06 00:00:00+07	\N
01562	ROY PERMADI	L	2023-01-09 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Pakuwon City	GA	KARYAWAN	Tidak	81238704688	roy_permadi@gloriaschool.org	1986-10-18 00:00:00+07	\N
01360	RICO ANDHIKA PERMANA	L	2019-08-01 00:00:00+07	\N	Lajang	HONORER	SMP2	Pakuwon City	GURU	GURU	Tidak	089646897397	ricoandhika88@gmail.com	1988-11-02 00:00:00+07	\N
00232	DIKKY ARSETIADJI	L	2010-07-12 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	\N	\N	1984-05-12 00:00:00+07	\N
01198	AGUNG EKA NURCAHYO	L	2018-04-17 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	TATA USAHA	KARYAWAN	Aktif	\N	agung_nurcahyo@gloriaschool.org	1986-07-07 00:00:00+07	1F  C0  13  E6
01563	CHRISTINE ANGELA	P	2023-01-30 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	81703343691	christine_angela@gloriaschool.org	1998-01-14 00:00:00+07	\N
01175	YOGI DIAN KURNIAWAN	L	2018-01-03 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	089660574091	yogi_kurniawan@gloriaschool.org	1988-09-03 00:00:00+07	\N
00306	WIWIK HARININGSIH	P	2003-05-02 00:00:00+07	\N	Cerai	FULL TIME	SMA1	Sukomanunggal	STAF UKS	KARYAWAN	Aktif	085706500659	wiwik_hariningsih@gloriaschool.org	1972-02-13 00:00:00+07	7F  0C  15  E6
00138	EUNIKE YULIKA NUGROHO GUNAWAN	P	2010-08-05 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	WAKIL KEPALA SEKOLAH	GURU	Aktif	082232176896	eunike_yulika@gloriaschool.org	1988-07-27 00:00:00+07	7F  E0  0B  E6
01371	YUDITH KURNIAWAN	L	2019-08-20 00:00:00+07	\N	Lajang	PART TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	085231687175	\N	1985-07-13 00:00:00+07	\N
00442	MELIANI	P	2011-07-01 00:00:00+07	\N	Lajang	-	PGTK2	Kupang Indah	GURU	GURU	Tidak	728819551	\N	1983-05-21 00:00:00+07	\N
00842	ANDRY SATRYA WIJAYA	L	2014-11-11 00:00:00+07	\N	Lajang	HONORER	SMA1	Sukomanunggal	GURU	GURU	Tidak	081272733609	\N	1991-01-29 00:00:00+07	\N
00648	JAMES NICOLAUS	L	2013-05-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	TATA USAHA	KARYAWAN	Aktif	083199228383	james_nicolaus@gloriaschool.org	1982-05-05 00:00:00+07	BF  DB  0C  E6
01101	DENNY GUNAWAN	L	2017-04-03 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	082335027756	\N	1995-10-26 00:00:00+07	\N
01425	IMANUEL FAJAR TRIJANTO	L	2020-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	081227423158	imanuel_trijanto@gloriaschool.org	1996-09-01 00:00:00+07	\N
00280	ERNA WIDI SEPTIHARYANTI	P	2011-07-13 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	\N	erna_widi@gloriaschool.org	1977-09-15 00:00:00+07	1F  E7  12  E6
00884	TIMBUL BUTAR BUTAR	L	2015-06-01 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	TATA USAHA	KARYAWAN	Tidak	082322293193	\N	1988-01-12 00:00:00+07	\N
00480	SOPHIA YONATAN	P	2011-07-28 00:00:00+07	\N	TBA	HONORER	SMP2	Pakuwon City	GURU	GURU	Tidak	081803088530	\N	1982-12-15 00:00:00+07	\N
00363	BAMBANG ANISWORO ADI	L	2008-11-28 00:00:00+07	\N	Menikah	FULL TIME	UMUM	Kupang Indah	SOPIR	KARYAWAN	Tidak	\N	\N	1980-02-10 00:00:00+07	\N
01222	ROSALIA FRANSISCA IRMAWAN	P	2018-07-02 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	085713616652	rosalia_irmawan@gloriaschool.org	1995-06-30 00:00:00+07	\N
01361	BHRE DHATU BRAHMANTYA	L	2019-08-05 00:00:00+07	\N	Lajang	HONORER	SD2	Kupang Indah	GURU	GURU	Tidak	081703109108	bhredhatu@yahoo.com	1985-10-30 00:00:00+07	\N
01149	IRENE MAYNANDA ANGIELINA	P	2017-08-28 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	WAKIL KEPALA SEKOLAH	GURU	Aktif	081358431234	irine_maynanda@gloriaschool.org	1988-05-31 15:30:33+07	FF  17  10  E6
00944	AGUSTINUS I GEDE SUTAWIJAYA	L	2015-07-31 00:00:00+07	\N	Menikah	HONORER	SMP1	Kupang Indah	GURU	GURU	Tidak	0818377448	\N	1965-04-09 00:00:00+07	\N
01564	DINI IRAWATI	P	2023-01-25 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	AKUNTING	KARYAWAN	Aktif	081358905812	dini_irawati@gloriaschool.org	1991-10-14 00:00:00+07	9F  39  13  E6
01582	VAROLD JULIAN TJOANTO	L	2023-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	082198308372	varold_tjoanto@gloriaschool.org	1992-07-03 00:00:00+07	\N
00467	ANASTASIA HERA	P	2011-07-08 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	\N	anastasia_hera@gloriaschool.org	1973-03-05 00:00:00+07	BF  FA  11  E6
00385	FARIDA	P	2004-04-13 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	KEUANGAN	KARYAWAN	Tidak	\N	\N	1975-02-24 00:00:00+07	\N
01167	WELYAM SAPUTRA, LIM	L	2017-11-15 00:00:00+07	\N	Lajang	PART TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	083849333055	\N	1988-12-24 00:00:00+07	\N
00456	ARYO PUTRA ARDHITIANTO	L	2011-06-22 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	TATA USAHA	KARYAWAN	Tidak	08165444148	\N	1980-03-07 00:00:00+07	\N
00015	FRANSISKA BINAR	P	2010-07-12 00:00:00+07	\N	Menikah	FULL TIME	SD1	Pacar	SUSTER	KARYAWAN	Tidak	\N	\N	1985-01-18 00:00:00+07	\N
00590	SATRIADI WIBOWO	L	2012-10-15 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	085640495046	\N	1987-02-26 00:00:00+07	\N
00424	RONNIE HENDRIK RIYANTO	L	2010-11-01 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	\N	\N	1986-01-02 00:00:00+07	\N
01426	SILVIA DE FRETES	P	2020-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	081291170242	silvia_defretes@gloriaschool.org	1995-01-31 00:00:00+07	3F  7D  16  E6
01629	TIMOTHY KRISNADI	L	2024-01-02 00:00:00+07	\N	Lajang	HONORER	SMA2	Pakuwon City	GURU	GURU	Tidak	081232727570	timothykrisnadi@gmail.com	2001-01-04 00:00:00+07	\N
01467	PHILIA CHRISTY M.	P	2021-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	087834306111	philia_christy@gloriaschool.org	1994-04-04 00:00:00+07	\N
01380	ALOYSIUS HANDY WIBOWO	L	2019-10-28 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	LOGISTIK	KARYAWAN	Aktif	0813-9271-3085	handy_wibowo@gloriaschool.org	1993-06-08 00:00:00+07	FF  25  15  E6
01054	NATASYA BINTANG ANDRIYANTI ROBERTO	P	2016-08-08 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	081234220615	\N	1993-07-21 00:00:00+07	\N
00875	ANDREAS ARMANDO PRASTOWO	L	2015-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	089679450849	andreas_armando@gloriaschool.org	1991-12-13 00:00:00+07	7F  16  12  E6
01196	RYO SEPTIAN	L	2018-04-16 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	082229091982	ryo_septian@gloriaschool.org	1992-09-02 00:00:00+07	3F  29  18  E6
00953	ARDIAN PURNOMO SAMPURNO ST, SE	L	2015-12-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	GA	KARYAWAN	Tidak	082244227895	\N	1976-02-13 00:00:00+07	\N
01703	GABRIELLA ALVIONI SINARTONO	P	2025-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	082143058899	gabriella_sinartono@gloriaschool.org	2000-11-23 00:00:00+07	5F  40  15  E6
00041	YE. IKA ROSALINA	P	2010-07-01 00:00:00+07	\N	Cerai	FULL TIME	SD1	Pacar	GURU	GURU	Aktif	081553400175	ika_rosalina@gloriaschool.org	1972-08-20 00:00:00+07	FF  69  12  E6
80022	AL HADID AMMASH	L	2025-07-01 00:00:00+07	\N	Lajang	-	SMA1	Sukomanunggal	NON PEGAWAI	NON PEGAWAI	Tidak	081938300610	alhadidammash@gmail.com	1988-09-11 00:00:00+07	\N
00942	VICTOR MARULITUA L TOBING	L	2015-08-01 00:00:00+07	\N	Menikah	HONORER	SMP2	Pakuwon City	GURU	GURU	Tidak	081931080500	\N	1965-10-28 00:00:00+07	\N
00830	TARFIAN ARYO SADEWO	L	2014-12-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Pakuwon City	IT	KARYAWAN	Aktif	'089681595917	tarfian_aryo@gloriaschool.org	1985-03-20 00:00:00+07	5F  AB  0F  E6
00670	DEWI KARLINA	P	2013-07-01 00:00:00+07	\N	Lajang	HONORER	SD2	Kupang Indah	GURU	GURU	Tidak	081999978280	\N	1988-04-25 00:00:00+07	\N
01200	SHERLY NATALIA KUMALADJAYA	P	2018-05-02 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	087823457088	sherly_natalia@gloriaschool.org	1991-12-19 00:00:00+07	\N
00131	DESSY ROSMARIA	P	2009-07-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	\N	\N	1982-10-16 00:00:00+07	\N
00922	OZORA YISRAEL IE	P	2015-08-10 00:00:00+07	\N	Lajang	PART TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	089675962306	\N	1990-09-14 00:00:00+07	\N
00126	ANNA MONALISA PELLO	P	2008-10-31 00:00:00+07	\N	Lajang	PART TIME	SD3	Pakuwon City	GURU	GURU	Tidak	081217238647	\N	1986-06-03 00:00:00+07	\N
01224	VERONICA STEPHANIE LEWERISSA	P	2018-07-06 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	PERPUSTAKAAN	KARYAWAN	Aktif	082341715048	veronica_lewerissa@gloriaschool.org	1993-12-09 00:00:00+07	5F  33  0C  E6
00101	LINDAWATI	P	2001-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	\N	\N	1975-03-18 00:00:00+07	\N
00091	ESTHER RATNANINGSIH	P	2005-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	083830554050	esther_ratnaningsih@gloriaschool.org	1979-10-04 00:00:00+07	5F  40  17  E6
01605	APRILIA DYAH K	P	2023-08-15 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Aktif	082244885793	aprilia_dyah@gloriaschool.org	1989-04-09 00:00:00+07	9F  A3  0E  E6
01163	YENI AFIANA RACHMAN	P	2017-10-17 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	08563422242	yeni_afiana@gloriaschool.org	1991-01-11 00:00:00+07	DF  17  10  E6
00207	NUNUK INDAH DAHLIA	P	1996-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	PERPUSTAKAAN	KARYAWAN	Aktif	\N	nunuk_dahlia@gloriaschool.org	1972-12-20 00:00:00+07	DF  39  11  E6
00623	GRADINA PATRICE WIJAYANTI	P	2013-01-21 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	UNIT USAHA	KARYAWAN	Aktif	085649992256	patrice_wijayanti@gloriaschool.org	1990-12-01 00:00:00+07	1F  93  17  E6
00714	FANNY PUSPITA SARI GO, S.I.KOM	P	2013-09-16 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	TATA USAHA	KARYAWAN	Aktif	081703701301	fanny_go@gloriaschool.org	1991-01-17 00:00:00+07	1F  CA  0D  E6
00566	DEWI ANGGRAENI TANJAYA	P	2012-08-03 00:00:00+07	\N	Lajang	HONORER	SMP1	Kupang Indah	GURU	GURU	Tidak	08123573534	\N	1986-06-26 00:00:00+07	\N
00735	LUKAS DWIKY SETIAWAN	L	2014-01-03 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	PERPUSTAKAAN	KARYAWAN	Tidak	081233390664	\N	1990-03-02 00:00:00+07	\N
01093	AIDA PURNASARI	P	2017-03-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	081330550888	\N	1978-01-23 00:00:00+07	\N
00777	HERU JOHAN	L	2014-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	082139736208	\N	1991-02-08 00:00:00+07	\N
00384	ESTHER CHRISTININGRUM	P	2006-07-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	KURIKULUM KBTK-SD	KARYAWAN	Aktif	08123021274	esther_christiningrum@gloriaschool.org	1974-12-23 00:00:00+07	FF  F5  17  E6
00216	SUMIYARTI, S.SI.	P	2008-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	WAKIL KEPALA SEKOLAH	GURU	Aktif	\N	sumiyarti@gloriaschool.org	1980-03-04 00:00:00+07	5F  C3  11  E6
00239	HADI SUTANTO	L	2010-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	081703123430	\N	1984-11-28 00:00:00+07	\N
01213	PARANITA RISTIANA MEITJING	P	2018-07-02 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	087781010919	\N	1989-02-02 00:00:00+07	\N
00346	WIGIT WISMANTORO	L	2003-06-09 00:00:00+07	\N	Menikah	FULL TIME	SATPAM	Sukomanunggal	SECURITY	KARYAWAN	Aktif	085850943807	wismantorow@gmail.com	1971-09-20 00:00:00+07	\N
00050	DIAN YANUAR	P	2004-09-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Aktif	\N	dian_yanuar@gloriaschool.org	1980-01-22 00:00:00+07	9F  97  10  E6
00402	TINCE FAY	P	2003-07-14 00:00:00+07	\N	Menikah	FULL TIME	UMUM	Kupang Indah	KANTIN	KARYAWAN	Aktif	082143758781	tincefay95@gmail.com	1981-10-10 00:00:00+07	\N
90023	BERLYSYA HARTONO	P	2024-05-13 00:00:00+07	\N	Lajang	-	YAYASAN	Kupang Indah	SUSTER	OUTSOURCING	Aktif	\N	\N	2001-09-06 00:00:00+07	C6  B8  03  1A
01511	CRISTHANANTA SINDORO	L	2022-05-09 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	085155025251	cristhananta_sindoro@gloriaschool.org	1998-07-23 00:00:00+07	\N
90018	CHRISTIANI ANGELYN	P	2022-07-01 00:00:00+07	\N	Lajang	-	YAYASAN	Kupang Indah	SUSTER	OUTSOURCING	Aktif	\N	\N	1945-08-17 00:00:00+09	26  EC  E6  19
00538	SILVIA KOESMONO	P	2015-07-15 00:00:00+07	\N	Menikah	PART TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	085746550088	\N	1978-06-28 00:00:00+07	\N
00564	MARIA VERONICA	P	2012-08-02 00:00:00+07	\N	Menikah	HONORER	SMP1	Kupang Indah	GURU	GURU	Tidak	082142833686	\N	1983-05-22 00:00:00+07	\N
00838	BASUKI SUPRIYONO	L	2015-02-02 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	UMUM	KARYAWAN	Tidak	081330086980	\N	1960-01-30 00:00:00+07:30	\N
01487	CHRISTIANTI ANGELINA. E	P	2021-08-02 00:00:00+07	\N	Lajang	FULL TIME	SD4	Grand Pakuwon	WAKIL KEPALA SEKOLAH	GURU	Aktif	089530258557	christianti_angelina@gloriaschool.org	1992-08-27 00:00:00+07	5F  4E  10  E6
00240	IE DAVID	L	2009-07-01 00:00:00+07	\N	Menikah	PART TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	\N	\N	1970-07-23 00:00:00+07	\N
00988	SHERLY TRIDIYANTI	P	2016-04-15 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	089605050384	\N	1991-10-11 00:00:00+07	\N
01475	GALIH JIMMY LAY	L	2021-08-01 00:00:00+07	\N	Lajang	HONORER	SMP2	Pakuwon City	GURU	GURU	Tidak	081359283647	galihjimmylay16@gmail.com	1996-05-18 00:00:00+07	\N
00618	ELSA MALAGESSY SITORUS	P	2013-01-14 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Kupang Indah	GURU	KARYAWAN	Tidak	081703217166	\N	1990-07-12 00:00:00+07	\N
00932	OLIVIA MELIANA	P	2015-07-01 00:00:00+07	\N	Lajang	PART TIME	SD3	Pakuwon City	GURU	GURU	Tidak	087854156679	\N	1992-07-22 00:00:00+07	\N
00731	ROSALITA EVA MARPAUNG	P	2014-01-03 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	UNIT USAHA	KARYAWAN	Aktif	083856060332	rosalita_marpaung@gloriaschool.org	1990-03-11 00:00:00+07	1F  40  17  E6
00722	YUSTINE YUHANI BASUKI	P	2013-10-02 00:00:00+07	\N	Lajang	HONORER	SMP2	Pakuwon City	GURU	GURU	Tidak	08175083363	\N	1987-06-08 00:00:00+07	\N
01617	EKA GILROY KHARIS	L	2023-11-06 00:00:00+07	\N	Menikah	HONORER	SMA2	Pakuwon City	GURU	GURU	Tidak	081519655495	ekagilroy@gmail.com	1995-12-27 00:00:00+07	\N
01493	DERBY GABRIELE TULANDI	P	2021-09-15 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	TATA USAHA	KARYAWAN	Aktif	085155447465	derby_tulandi@gloriaschool.org	1997-12-29 00:00:00+07	3F  BD  15  E6
01308	ANUGERAH AGUNG KRISTIAWAN	L	2019-02-15 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	085727981543	agung_kristiawan@gloriaschool.org	1996-02-02 00:00:00+07	\N
01578	CANDRA WULANSARI	P	2023-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	085773903938	candra_wulansari@gloriaschool.org	1989-11-27 00:00:00+07	\N
01678	HSIE MICHIKO SACHI	P	2024-10-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK1	Pacar	GURU	GURU	Aktif	08990339631	michiko_sachi@gloriaschool.org	2001-10-08 00:00:00+07	5F  4A  0B  E6
00947	ANDRA OPRASISKA JUNIAR WINARTO A.Md	L	2015-09-28 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	PERPUSTAKAAN	KARYAWAN	Tidak	089678123454	\N	1988-06-25 00:00:00+07	\N
01060	INGE OCTAVIA SURYONO	P	2016-09-01 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	085748499871	inge_octavia@gloriaschool.org	1992-10-15 00:00:00+07	3F  2F  0E  E6
01445	LIDIA WULANDARI	P	2020-09-10 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Pacar	UNIT USAHA	KARYAWAN	Tidak	0818502858	lidia_wulandari@gloriaschool.org	1965-09-08 00:00:00+07	BF  26  0F  E6
00614	PRASTAWA ADI WANDA BINUKA	L	2013-01-04 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Pakuwon City	IT	KARYAWAN	Aktif	085643880788	prastawa_adi@gloriaschool.org	1989-07-12 00:00:00+07	DF  1E  0C  E6
01100	SILVIA PRISTI WERDINENGGAR	P	2017-04-03 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	085607001025	silvia_pristi@gloriaschool.org	1992-05-22 00:00:00+07	\N
01087	YHERIAWAN PUTRA WIBAWA	L	2017-01-26 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	TATA USAHA	KARYAWAN	Aktif	08999918904	yheriawan_wibawa@gloriaschool.org	1991-01-06 00:00:00+07	1F  60  0E  E6
01739	IVAN EZRA ARDANA	L	2025-11-01 00:00:00+07	\N	Lajang	PART TIME	SMP1	Kupang Indah	GURU	GURU	Aktif	085157155722	\N	1999-05-26 00:00:00+07	\N
01328	KRISTIANITA WIDYAANDARI ELISA	P	2019-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	081234399887	kristianita_elisa@gloriaschool.org	1992-07-17 00:00:00+07	FF  7B  14  E6
01082	ARLEN MARCIA LEONARD	P	2017-01-16 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	082140675646	\N	1993-03-23 00:00:00+07	\N
00845	DEBORAH MARTINI WULU	P	2015-02-25 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	085232797953	\N	1992-03-11 00:00:00+07	\N
01615	DEBORA ERNAULI BORUSIAHAAN	P	2023-11-01 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	AKUNTING	KARYAWAN	Aktif	082140774019	debora_borusiahaan@gloriaschool.org	1998-06-04 00:00:00+07	DF  54  13  E6
00421	EVELYN GUNADI	P	2010-10-01 00:00:00+07	\N	Menikah	-	YAYASAN	Kupang Indah	PEMBELIAN	KARYAWAN	Tidak	\N	\N	1985-06-13 00:00:00+07	\N
00404	WAHYUNINGSIH TANUWIDJAJA	P	1996-10-01 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	UNIT USAHA	KARYAWAN	Tidak	08155137799	\N	1962-11-18 00:00:00+07:30	\N
00302	SRI WAHYUNI	P	2010-07-20 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	085330247007	\N	1987-09-04 00:00:00+07	\N
00703	ARI YULIA	P	2013-08-19 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	TATA USAHA	KARYAWAN	Tidak	\N	\N	1987-07-11 00:00:00+07	\N
00237	ENDAH PURNANINGSIH	P	2010-03-01 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	\N	\N	1977-11-12 00:00:00+07	\N
01638	VIVIANTI	P	2024-07-01 00:00:00+07	\N	Menikah	HONORER	SD2	Kupang Indah	GURU	GURU	Tidak	08165414178	viviangwie@gmail.com	1975-04-11 00:00:00+07	\N
00584	EDITYA PRETASYA EFERDIAN	L	2012-08-13 00:00:00+07	\N	Lajang	HONORER	SMA2	Pakuwon City	GURU	GURU	Tidak	081937098004	\N	1989-02-22 00:00:00+07	\N
00309	DJOKO PRAYITNO	L	2000-07-01 00:00:00+07	\N	Menikah	FULL TIME	UMUM	Kupang Indah	KEBERSIHAN	KARYAWAN	Tidak	08813292856	djokoprayitno121@gmail.com	1970-01-10 00:00:00+07	\N
01635	SISKA NINDA TRIANA	P	2024-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	085764648157	siska_triana@gloriaschool.org	1996-08-09 00:00:00+07	5F  91  16  E6
01641	KARLIN TENATA	P	2024-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	085215318899	karlin_tenata@gloriaschool.org	2002-03-05 00:00:00+07	7F  AB  0F  E6
01604	SUSAN AGUSTINA HALIEM	P	2023-08-14 00:00:00+07	\N	Cerai	PART TIME	SD1	Pacar	GURU	GURU	Aktif	082233722799	susan_haliem@gloriaschool.org	1992-08-19 00:00:00+07	\N
00587	FENNY YONATAN	P	2012-09-20 00:00:00+07	\N	Lajang	PART TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	081803088531	\N	1989-04-23 00:00:00+07	\N
00035	SULIK	P	2007-01-05 00:00:00+07	\N	Menikah	FULL TIME	PGTK1	Pacar	SUSTER	KARYAWAN	Aktif	\N	sulikwaluyo@gmail.com	1974-09-24 00:00:00+07	56  B8  AD  19
00525	NOVIA VERAWATI SANTOSA	P	2012-07-01 00:00:00+07	\N	Lajang	PART TIME	PGTK2	Kupang Indah	GURU	GURU	Tidak	0817395476	\N	1989-11-19 00:00:00+07	\N
00397	REBECCA SUSAN	P	2004-12-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	KEUANGAN	KARYAWAN	Aktif	087851476361	rebecca_susan@gloriaschool.org	1970-10-30 00:00:00+07	5F  67  16  E6
00082	DIAN PURWORINI	P	2002-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	08123164449	dian_purworini@gloriaschool.org	1978-10-09 00:00:00+07	\N
01645	RAYMUNDUS TEGAR PAMBUDI	L	2024-05-27 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	IT	KARYAWAN	Aktif	081336776022	tegar_pambudi@gloriaschool.org	1992-02-01 00:00:00+07	5F  49  0C  E6
01154	EFAN SANJAYA	L	2017-09-12 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	085341101234	\N	1995-06-03 00:00:00+07	\N
00151	LENNY CHRISTINAWATI S	P	2010-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	\N	\N	1985-06-01 00:00:00+07	\N
00665	NATALIA SUCIPTO LAUW	P	2013-07-01 00:00:00+07	\N	Lajang	PART TIME	SD1	Pacar	GURU	GURU	Tidak	08983878100	natalia_sucipto@gloriaschool.org	1990-12-11 00:00:00+07	\N
01492	ANDREAS PAMBUDI	L	2021-09-08 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	089681381886	Andreaspambudi38@gmail.com	1996-08-05 00:00:00+07	\N
00039	VIKA SEPTI YULIANA	P	2003-07-03 00:00:00+07	\N	Lajang	FULL TIME	SD1	Pacar	SUSTER	GURU	Tidak	\N	\N	1983-09-22 00:00:00+07	\N
00294	OTNIOL HANIBAL SEBA, S.TH	L	2004-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	\N	\N	1976-10-12 00:00:00+07	\N
00064	RETNO SUSANTI	P	2003-07-14 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Tidak	08216178058	\N	1981-02-17 00:00:00+07	\N
01594	APPERENTIA FIDE	P	2023-08-01 00:00:00+07	\N	Menikah	HONORER	SMP2	Pakuwon City	GURU	GURU	Tidak	895366608884	\N	1996-04-03 00:00:00+07	\N
00451	DWI PRASETIANTO	L	2011-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	08123297767	dwi_prasetianto@gloriaschool.org	1976-06-11 00:00:00+07	1F  E7  10  E6
00228	APRIYANTO SALIM	L	2010-10-01 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	KURIKULUM SMP-SMA	KARYAWAN	Tidak	08811026805	apriyanto_salim@gloriaschool.org	1989-04-18 00:00:00+07	\N
00339	BAMBANG PURWANTO	L	1996-09-01 00:00:00+07	\N	Menikah	FULL TIME	SATPAM	Sukomanunggal	SECURITY	KARYAWAN	Aktif	085733785778	bambang.purwanto1976@gmail.com	1976-05-03 00:00:00+07	\N
01091	HELEN MELINDA KHO	P	2017-02-16 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	081333319301	\N	1991-03-09 00:00:00+07	\N
00472	DIAN KUSUMAWATI SUNARTO	P	2011-07-07 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	KEUANGAN	KARYAWAN	Tidak	0818323683	dian_soenarto@gloriaschool.org	1985-08-28 00:00:00+07	\N
00478	WIDYANINGTYAS	P	2011-08-09 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Tidak	087822520303	\N	1981-04-04 00:00:00+07	\N
01535	ERISTA REBECA ROULINA SIAHAAN	P	2022-08-29 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Aktif	8115381970	erista_siahaan@gloriaschool.org	1998-03-07 00:00:00+07	BF  7B  14  E6
01711	ELLEN ROOSYE MOOCE CUSSOY	P	2025-07-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	KURIKULUM KBTK-SD	KARYAWAN	Aktif	082165050595	ellen_cussoy@gloriaschool.org	1981-01-16 00:00:00+07	BF  AA  14  E6
01398	EVELYN APRESIA SOETANTO	P	2020-03-16 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	TATA USAHA	KARYAWAN	Tidak	085333139383	evelyn_soetanto@gloriaschool.org	1996-04-07 00:00:00+07	\N
01418	ULFA MEINIA DWI ROHANDA	P	2020-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	088996634143	ulfa_rohanda@gloriaschool.org	1998-05-15 00:00:00+07	3F  03  11  E6
00117	TARULI FRANSISKA L	P	2010-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	\N	\N	1987-04-18 00:00:00+07	\N
00407	YOHANA NICOLAS	P	2002-05-02 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	UNIT USAHA	GURU	Tidak	\N	\N	1954-12-17 00:00:00+07:30	\N
01157	EIRENE EMARETTA CHAHYADI	P	2017-10-02 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	BIMBINGAN/KONSELING	GURU	Tidak	085748279247	\N	1995-03-08 00:00:00+07	\N
00321	SUWARNI	P	1997-07-01 00:00:00+07	\N	Menikah	FULL TIME	UMUM	Kupang Indah	KEBERSIHAN	KARYAWAN	Tidak	085230441061	\N	1958-09-18 00:00:00+07:30	\N
00749	DARMA MEKA	L	2014-04-01 00:00:00+07	\N	Lajang	HONORER	SMA1	Sukomanunggal	GURU	GURU	Tidak	081333363317	\N	1990-02-20 00:00:00+07	\N
01337	DIKKY ARSETIADJI	L	2019-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	08315861884	dikky_arsetiadji@gloriaschool.org	1984-05-12 00:00:00+07	3F  E7  12  E6
00263	WAHYU DWI PANUKSMI	P	2010-07-01 00:00:00+07	\N	Menikah	PART TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	0817394460	\N	1985-01-08 00:00:00+07	\N
00729	WAHYU SANJAYA	L	2014-01-06 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	08983368750	\N	1987-04-12 00:00:00+07	\N
00532	YONATAN KARLIS CHRISTANTIKA	L	2012-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	085640306766	yonatan_karlis@gloriaschool.org	1988-03-02 00:00:00+07	BF  F2  14  E6
00660	DIANA ANGGONO	P	2013-07-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Tidak	081235998877	\N	1990-11-26 00:00:00+07	\N
00800	DEVI ARYANI	P	2014-08-06 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	08993697739	\N	1991-12-28 00:00:00+07	\N
01387	IRENE CHRISTIAN	P	2020-01-03 00:00:00+07	\N	Lajang	PART TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	083192800890	irenechristian93@gmail.com	1993-08-03 00:00:00+07	\N
01336	WINDAYANI LILING	P	2019-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD4	Grand Pakuwon	GURU	GURU	Aktif	085242210903	windayani_liling@gloriaschool.org	1994-07-15 00:00:00+07	3F  AB  0F  E6
01652	LAURENCIA VIOLITTA	P	2024-06-10 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	AKUNTING	KARYAWAN	Tidak	082257617102	laurencia_violitta@gloriaschool.org	1993-02-01 00:00:00+07	\N
01673	APINASARI	P	2024-08-07 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Aktif	\N	apinasari@gloriaschool.org	1996-04-13 00:00:00+07	3F  1E  11  E6
01365	AIDA PURNASARI	P	2019-08-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	081330550888	aida_purnasari@gloriaschool.org	1978-01-23 00:00:00+07	\N
01561	GERALD OCTAVIAN	L	2023-01-15 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	LOGISTIK	KARYAWAN	Aktif	\N	gerald_octavian@gloriaschool.org	1997-10-25 00:00:00+07	7F  A7  17  E6
01501	MICHAEL WIRADINATA	L	2022-01-04 00:00:00+07	\N	Lajang	HONORER	SMA2	Pakuwon City	GURU	GURU	Tidak	087854998822	michael281201@gmail.com	2001-12-28 00:00:00+07	\N
00552	ELISABET KRISTINA CHRISTOFFEL	P	2012-07-06 00:00:00+07	\N	Cerai	FULL TIME	PGTK1	Pacar	SUSTER	KARYAWAN	Aktif	082141255564	elisabetkristina10@gmail.com	1984-09-10 00:00:00+07	E6  83  AE  19
00262	TRANGNJONO SOEWARNO	L	2009-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	\N	trangnjono_soewarno@gloriaschool.org	1971-12-24 00:00:00+07	9F  A7  11  E6
01089	AGNES YUSTIKA WULAN ARUM	P	2017-02-07 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	WAKIL KEPALA SEKOLAH	GURU	Aktif	085642027233	agnes_yustika@gloriaschool.org	1994-01-25 00:00:00+07	BF  69  17  E6
00763	HADI SUTANTO	L	2014-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	081703123430	hadi_sutanto@gloriaschool.org	1984-11-28 00:00:00+07	FF  F1  0E  E6
00978	MALKUS NICOLAS SAMAR	L	2016-02-26 00:00:00+07	\N	Lajang	HONORER	SMP1	Kupang Indah	GURU	GURU	Tidak	082234080624	\N	1985-03-31 00:00:00+07	\N
00559	SEMAYA ELIZABETH WIDODO	P	2012-07-31 00:00:00+07	\N	Lajang	HONORER	SMA1	Sukomanunggal	GURU	GURU	Tidak	085755593785	\N	1989-09-23 00:00:00+07	\N
00195	HARRY SUSANTO, S.PD.	L	2005-10-01 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Aktif	087851717323	harry_susanto@gloriaschool.org	1981-02-04 00:00:00+07	9F  46  14  E6
00704	WIWIN SOUMOKIL	P	2013-09-02 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	SUSTER	KARYAWAN	Tidak	081330597433	\N	1979-12-04 00:00:00+07	\N
80014	ADITYA ANGGORO WIDHI NUGROHO	L	2025-07-01 00:00:00+07	\N	Lajang	-	SMP1	Kupang Indah	NON PEGAWAI	NON PEGAWAI	Aktif	81233920428	adityaucielwork@gmail.com	1992-08-11 00:00:00+07	\N
01671	RIBKA FERIYANA, DRA	P	2024-07-01 00:00:00+07	\N	Menikah	PART TIME	YAYASAN	Kupang Indah	ADVISOR DEPARTEMEN OPERASIONAL	KARYAWAN	Tidak	0811334138	ribka_feriyana@gloriaschool.org	1961-02-26 00:00:00+07:30	\N
01340	VERONICA LITA HAPSARI	P	2019-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	082143346137	veronica_hapsari@gloriaschool.org	1991-02-19 00:00:00+07	\N
90026	RACHELSA SULISTYO TANTI	P	2024-10-14 00:00:00+07	\N	Lajang	-	YAYASAN	Pakuwon City	SUSTER	OUTSOURCING	Aktif	081232925354	rachelsa_sulistyo@gloriaschool.org	1998-05-01 00:00:00+07	C6  83  B7  19
01237	STEFANY	P	2018-08-01 00:00:00+07	\N	Lajang	HONORER	SMP2	Pakuwon City	GURU	GURU	Tidak	081312500045	\N	1996-09-30 00:00:00+07	\N
00241	IKA KRISMAHAYU	P	2007-07-10 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	081230988952	ika_krismahayu@gloriaschool.org	1979-01-03 00:00:00+07	DF  E1  0F  E6
01195	GISTA AYU KUSUMA WARDANI	P	2018-04-03 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	082221070024	gista_ayu@gloriaschool.org	1996-05-31 00:00:00+07	\N
00502	HOTMA ULI ROSITA	P	2012-01-03 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	PEMBELIAN	KARYAWAN	Aktif	085648171388	hotma_rosita@gloriaschool.org	1982-01-18 00:00:00+07	3F  26  15  E6
00831	LIBERTIN GEA	P	2014-11-28 00:00:00+07	\N	Lajang	FULL TIME	SD1	Pacar	GURU	GURU	Tidak	081362151282	\N	1989-05-29 00:00:00+07	\N
01656	NOPTIANUS SYUKUR SELAMAT ZENDRATO	L	2024-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	081399555706	noptianus_zendrato@gloriaschool.org	1987-11-10 00:00:00+07	1F  03  11  E6
00936	EDDY SUBYAKTO	L	2015-08-20 00:00:00+07	\N	Menikah	HONORER	SD3	Pakuwon City	GURU	GURU	Tidak	081515544669	Eddysubyakto@gmail.com	1966-08-05 00:00:00+07	\N
00991	TOMAS PERMANA	L	2016-04-20 00:00:00+07	\N	Menikah	FULL TIME	SD1	Pacar	GURU	GURU	Tidak	082141620000	tomas_permana@gloriaschool.org	1991-08-10 00:00:00+07	\N
01228	LAU .JESSICA LEO	P	2018-07-10 00:00:00+07	\N	Lajang	PART TIME	PGTK2	Kupang Indah	GURU	GURU	Tidak	08179318028	jessica_leo06@hotmail.com	1991-06-16 00:00:00+07	\N
00345	WIDODO	L	2006-10-30 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Sukomanunggal	SECURITY	KARYAWAN	Aktif	085733737059	widodoseksi5@gmail.com	1972-06-20 00:00:00+07	\N
01583	RUDI KURNIAWAN	L	2023-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Aktif	081331266771	rudi_kurniawan@gloriaschool.org	1983-07-28 00:00:00+07	7F  7E  17  E6
00165	SILVANA CHARLA SUAWAH	P	2008-07-01 00:00:00+07	\N	Menikah	PART TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	081554411490	\N	1978-08-23 00:00:00+07	\N
00375	ADITIA UNGGUL WIDIANTO	L	2007-07-02 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	IT	KARYAWAN	Aktif	08563118079	aditia_unggul@gloriaschool.org	1983-03-12 00:00:00+07	7F  59  15  E6
00283	FIFI TRISNAWATI	P	2003-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	WAKIL KEPALA SEKOLAH	GURU	Tidak	\N	\N	1975-08-26 00:00:00+07	\N
00129	DAVID ADY NUGROHO	L	2008-08-11 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	PERPUSTAKAAN	KARYAWAN	Aktif	\N	david_nugroho@gloriaschool.org	1980-04-24 00:00:00+07	7F  4E  10  E6
00761	FELIX SUTANTO	L	2014-07-01 00:00:00+07	\N	Menikah	PART TIME	SD3	Pakuwon City	GURU	GURU	Tidak	087875776767	\N	1987-01-15 00:00:00+07	\N
00191	ELOK SUPRI ARDITI	P	2010-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	085731184832	elok_supri@gloriaschool.org	1980-05-15 00:00:00+07	3F  39  18  E6
00631	RATIH TRI HANAWATI	P	2013-03-06 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	TATA USAHA	KARYAWAN	Aktif	085731944864	ratih_hanawati@gloriaschool.org	1988-07-22 00:00:00+07	9F  F2  14  E6
01459	MICHELLE PHONDA, S.DS.	P	2021-05-17 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	087752895323	michelle_phonda@gloriaschool.org	1994-08-20 00:00:00+07	\N
00825	CHRISTINA NATALIA SADEMI	P	2014-09-15 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	08970336591	christina_natalia@gloriaschool.org	1990-12-17 00:00:00+07	3F  CC  12  E6
90016	RENY OCTAVIA	P	2022-07-01 00:00:00+07	\N	Lajang	-	YAYASAN	Pakuwon City	SUSTER	OUTSOURCING	Aktif	\N	\N	1945-04-17 00:00:00+09	A6  3F  0F  1A
00969	RIFKA SARILAWISTA PARDEDE	P	2016-03-01 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	081396801019	\N	1991-01-19 00:00:00+07	\N
80010	MERLIN SANTOSO	P	2025-07-01 00:00:00+07	\N	Lajang	-	SD3	Pakuwon City	NON PEGAWAI	NON PEGAWAI	Aktif	08123007709	mrl_san@yahoo.com	1985-09-05 00:00:00+07	\N
01650	LENNY TENOJAYA	L	2024-06-05 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	KEUANGAN	KARYAWAN	Aktif	085648123925	lenny_tenojaya@gloriaschool.org	1988-08-06 00:00:00+07	9F  CA  0D  E6
00290	KENYO ENDAH PRAWESTI SE MM	P	2005-08-01 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	\N	kenyo_endah@gloriaschool.org	1974-04-11 00:00:00+07	7F  B0  10  E6
00359	YOHANIS FALLO	L	2002-07-25 00:00:00+07	\N	Menikah	FULL TIME	SATPAM	Kupang Indah	SECURITY	KARYAWAN	Aktif	081234405383	yohanesf1971@gmail.com	1971-01-10 00:00:00+07	\N
01719	MATHILDA BONITA KIMBAL	P	2025-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	082240274018	mathilda_kimbal@gloriaschool.org	1990-04-25 00:00:00+07	3F  D6  15  E6
00943	DELISA ANDREAS	P	2015-09-14 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	AKUNTING	KARYAWAN	Tidak	083856777313	delisa_andreas@gloriaschool.org	1993-08-09 00:00:00+07	\N
01687	JOSHUA ABNER RAMIREZ	L	2025-01-18 00:00:00+07	\N	Lajang	HONORER	SMA2	Pakuwon City	GURU	GURU	Tidak	085694818677	\N	2002-07-06 00:00:00+07	\N
00558	LISA ANITA	P	2012-07-25 00:00:00+07	\N	Lajang	-	YAYASAN	Kupang Indah	AKUNTING	KARYAWAN	Tidak	082140001917	\N	1987-09-25 00:00:00+07	\N
01169	LOVINA WIJAYANTI	P	2017-11-20 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	WAKIL KEPALA SEKOLAH	GURU	Aktif	087757235599	lovina_wijayanti@gloriaschool.org	1993-04-17 00:00:00+07	3F  74  0C  E6
00772	FERINAWATI HALAWA	P	2014-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Aktif	081222393904	ferinawati_halawa@gloriaschool.org	1984-02-27 00:00:00+07	7F  88  0C  E6
00760	LAURA JANE SIMANUNGKALIT	P	2014-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	085643336122	\N	1986-08-20 00:00:00+07	\N
01236	HENDRI SETIAWAN	L	2018-07-27 00:00:00+07	\N	Menikah	HONORER	SMP1	Kupang Indah	GURU	GURU	Tidak	082244456623	hendri888.hs@gmail.com	1978-04-27 00:00:00+07	\N
00010	DRH. ANI SRI WAHYUNI	P	2008-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD1	Pacar	GURU	GURU	Tidak	\N	\N	1980-06-28 00:00:00+07	\N
01076	YOHANA HANDANI	P	2016-11-15 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	PEMBELIAN	KARYAWAN	Tidak	081938143820	yohana_handani@gloriaschool.org	1994-08-13 00:00:00+07	\N
01207	DIAS GITA CHRISMANNA	L	2018-07-02 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	083867678132	dias_chrismanna@gloriaschool.org	1992-11-06 00:00:00+07	\N
00388	IIN MERDEKAWATY	P	2007-07-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	INTERNAL AUDIT	KARYAWAN	Tidak	\N	\N	1984-09-17 00:00:00+07	\N
00533	PUTERI KARTIKA RINI	P	2012-09-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	0812141009455	\N	1988-06-07 00:00:00+07	\N
01723	REBECCA CHARISTA PUTRI	P	2025-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD4	Grand Pakuwon	GURU	GURU	Aktif	085331765568	rebecca_putri@gloriaschool.org	2001-12-02 00:00:00+07	FF  69  17  E6
01230	SILVIA KOESMONO	P	2018-07-16 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	KURIKULUM SMP-SMA	KARYAWAN	Aktif	089506231277	silvia_koesmono@gloriaschool.org	1978-06-28 00:00:00+07	9F  69  0D  E6
00965	ELOK CHRISINAR, S.TH	P	2015-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	083856156740	elok_chrisinar@gloriaschool.org	1970-12-24 00:00:00+07	DF  55  11  E6
01689	JOSHUA THOMAS HUGHES	L	2025-02-13 00:00:00+07	\N	Menikah	FULL TIME	SMP3	Grand Pakuwon	GURU	GURU	Aktif	081554650149	joshua_hughes@gloriaschool.org	1982-09-08 00:00:00+07	7F  11  14  E6
01729	JEREMY MELVIN LUNTUNGAN	L	2025-07-01 00:00:00+07	\N	Lajang	PART TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	082233370742	jeremy_luntungan@gloriaschool.org	1996-01-31 00:00:00+07	3F  8C  15  E6
00516	ANITA IRAWAN	P	2012-04-02 00:00:00+07	\N	TBA	FULL TIME	YAYASAN	Kupang Indah	PPM	KARYAWAN	Tidak	085732068868	\N	1987-11-12 14:51:05+07	\N
00651	MELITA GUNARDI	P	2013-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	081703888318	\N	1990-02-23 00:00:00+07	\N
01712	EVA ANGELLIA CHARISTA	P	2025-05-15 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Aktif	081915360724	eva_charista@gloriaschool.org	1999-09-27 00:00:00+07	E6  49  BC  19
01705	GLORIA IMMANUELA ENDHY	P	2025-06-02 00:00:00+07	\N	Lajang	FULL TIME	SMP3	Grand Pakuwon	GURU	GURU	Aktif	083849832818	gloria_endhy@gloriaschool.org	2001-06-25 00:00:00+07	9F  61  14  E6
01630	RUT OKTAVIANI NAPITUPULU	P	2024-03-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	081249366706	rut_napitupulu@gloriaschool.org	1998-10-05 00:00:00+07	7F  41  0F  E6
00649	IVANA FELICIA HIUWANTO	P	2013-05-01 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	BIMBINGAN/KONSELING	GURU	Tidak	087753051011	\N	1990-04-23 00:00:00+07	\N
01545	HOSEA SUMALI	L	2022-09-20 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	085234025084	hosea_sumali@gloriaschool.org	1997-09-06 00:00:00+07	\N
90004	DANIEL DWI LUKIANTO	L	2022-07-01 00:00:00+07	\N	Lajang	-	YAYASAN	Kupang Indah	UMUM	OUTSOURCING	Tidak	\N	\N	2000-01-01 00:00:00+07	\N
01556	HOSEA SUMALI	L	2023-01-03 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	085234025084	hosea_sumali@gloriaschool.org	1997-09-06 00:00:00+07	\N
00455	ANDRI KAUNANG	L	2011-07-01 00:00:00+07	\N	Lajang	PART TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	77060576	\N	1987-04-02 00:00:00+07	\N
00462	SARCE NATALIA T	P	2011-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	PERPUSTAKAAN	KARYAWAN	Tidak	\N	\N	1987-12-20 00:00:00+07	\N
80015	HENDRI SETIAWAN	L	2025-07-01 00:00:00+07	\N	Menikah	-	SMP1	Kupang Indah	NON PEGAWAI	NON PEGAWAI	Aktif	082244456623	\N	1978-04-27 00:00:00+07	\N
01253	JOHANNA DYAH KRISTANTI	P	2018-11-15 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	082131926470	johanna_kristanti@gloriaschool.org	1991-08-01 00:00:00+07	\N
00847	MERRY CHRISTY ANGELINA	P	2015-03-23 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Kupang Indah	GURU	GURU	Aktif	082257224481	merry_christy@gloriaschool.org	1991-03-08 00:00:00+07	DF  2E  0E  E6
00642	GANJAR ADI NUGROHO	P	2013-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	PERPUSTAKAAN	KARYAWAN	Tidak	085691108785	\N	1992-12-30 00:00:00+07	\N
01704	EVA VIOLINA TANDIONO	P	2025-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Aktif	081217975792	eva_tandiono@gloriaschool.org	1997-02-07 00:00:00+07	9F  26  15  E6
01043	FERA HERAWATI	P	2016-07-18 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	SUSTER	KARYAWAN	Tidak	081233749354	\N	1994-04-03 00:00:00+07	\N
00797	DAVID KRISTIAN BUDIANTO	L	2016-08-01 00:00:00+07	\N	Menikah	HONORER	SD2	Kupang Indah	GURU	GURU	Tidak	081803003383	\N	1978-03-29 00:00:00+07	\N
01092	KRISTIAN WIDI ASTUTIK	P	2017-03-01 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	LABORAN	KARYAWAN	Aktif	085648358532	kristian_astutik@gloriaschool.org	1994-02-27 00:00:00+07	DF  02  11  E6
01317	YULIANI LIMANTORO	P	2019-04-01 00:00:00+07	\N	Menikah	FULL TIME	SD1	Pacar	GURU	GURU	Tidak	081977030116	yuliani_limantoro@gloriaschool.org	1990-08-29 00:00:00+07	\N
00276	DRA. VICTORIAWATI	P	2010-07-12 00:00:00+07	\N	Menikah	PART TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	\N	\N	1961-12-16 00:00:00+07:30	\N
01178	DEBORA CHRISTINA HANDJAJA	P	2018-01-03 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	TATA USAHA	KARYAWAN	Aktif	081929882741	debora_handjaja@gloriaschool.org	1994-11-23 00:00:00+07	FF  DE  11  E6
00040	WONG MILKA ELSAFAN	P	1987-09-01 00:00:00+07	\N	Menikah	FULL TIME	SD1	Pacar	GURU	GURU	Tidak	0818505105	wong_milka@gloriaschool.org	1963-02-18 00:00:00+07:30	\N
01625	CHEZAR ANDHI PRASETYA	L	2024-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Aktif	3572030511880001	chezar_prasetya@gloriaschool.org	1988-11-05 00:00:00+07	BF  D8  14  E6
01732	YOEL SATRIA NUGROHO	L	2025-07-14 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	081249137267	yoel_nugroho@gloriaschool.org	2003-05-31 00:00:00+07	7F  93  17  E6
00600	GUNIAWATI	P	2012-09-04 00:00:00+07	\N	Lajang	HONORER	SD2	Kupang Indah	GURU	GURU	Tidak	\N	\N	1968-12-29 00:00:00+07	\N
00279	ELISABETH YULIASARI	P	2007-07-10 10:06:22+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	081231541138	\N	1978-07-03 00:00:00+07	\N
00173	JAP FANG ZHEN	P	2009-07-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Aktif	08123284389	yap_fangzhen@gloriaschool.org	1969-04-14 00:00:00+07	7F  4F  16  E6
00663	SYLVIE MAYLIANE	P	2013-07-01 00:00:00+07	\N	Cerai	FULL TIME	PGTK2	Kupang Indah	SUSTER	KARYAWAN	Aktif	085646046081	sylviemayliane81@gmail.com	1981-05-06 00:00:00+07	26  5E  07  1A
00445	EVI ANUGRAHENI	P	2011-07-01 00:00:00+07	\N	Lajang	-	SD2	Kupang Indah	GURU	GURU	Tidak	085645355524	\N	1987-11-07 00:00:00+07	\N
00909	WILY CHRISTIAN SIMON	L	2015-08-01 00:00:00+07	\N	Lajang	PART TIME	SMA2	#N/A	GURU	GURU	Tidak	0817323855	\N	1989-12-19 00:00:00+07	\N
01262	GAYU WIBIYANTI	P	2019-01-15 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	BIMBINGAN/KONSELING	GURU	Tidak	08980737270	gayu_wibiyanti@gloriaschool.org	1994-10-04 00:00:00+07	\N
00123	YUNI SURYATI	P	2009-05-18 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	\N	\N	1983-06-04 00:00:00+07	\N
01521	OLIVIA VALENTINA	P	2022-07-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Aktif	087762584270	olivia_valentina@gloriaschool.org	1997-02-14 00:00:00+07	1F  91  16  E6
00229	ARIYANI PANCA RINI	P	2010-07-12 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	\N	\N	1978-01-18 00:00:00+07	\N
01592	YHUNANDA	L	2023-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	083851295386	yhunanda@gloriaschool.org	1998-08-13 00:00:00+07	BF  19  18  E6
01078	DEBORA CHRISTY DOA	P	2016-12-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	BIMBINGAN/KONSELING	GURU	Tidak	08113438000	\N	1994-04-15 00:00:00+07	\N
00607	ONGGO SUSILO	L	2012-10-01 00:00:00+07	\N	Menikah	HONORER	SMA2	Pakuwon City	GURU	GURU	Tidak	\N	\N	1976-12-30 00:00:00+07	\N
00524	TJIE SUN	L	2012-07-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Tidak	08993946685	tjie_sun@gloriaschool.org	1989-05-24 00:00:00+07	\N
00723	STEFAN NOVA NUGROHO	L	2013-11-01 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	089668811157	\N	1987-11-07 00:00:00+07	\N
00429	ANGGITHA PRAMIYASWARI	P	2011-02-09 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Tidak	085733173001	\N	1987-09-19 00:00:00+07	\N
00554	CHELLY BANUWATY MARISON	P	2012-07-23 00:00:00+07	\N	Menikah	PART TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	08175007606	\N	1967-10-05 00:00:00+07	\N
00305	WINATA SENTANA	L	2006-01-09 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	\N	\N	1965-11-14 00:00:00+07	\N
01173	RAKA PRASTYA BAGUS JATI KUSUMA M.PD.	L	2018-01-03 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	081335255707	\N	1989-09-10 00:00:00+07	\N
80040	JESSLYN MICHELLE GERANDY	P	2025-07-16 00:00:00+07	\N	Lajang	-	SD4	Grand Pakuwon	NON PEGAWAI	NON PEGAWAI	Aktif	0895399169997	\N	2004-02-09 00:00:00+07	\N
00460	IKA LILYANA SOESILO	P	2011-01-07 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	081515285908	\N	1989-08-12 00:00:00+07	\N
01185	EUNIKE WIRASEPUTRA	P	2018-02-05 00:00:00+07	\N	Lajang	HONORER	SD2	Kupang Indah	GURU	GURU	Tidak	081330679220	nikewiraseputra@gmail.com	1982-09-27 00:00:00+07	\N
01156	JEREMY MELVIN LUNTUNGAN	L	2017-09-11 00:00:00+07	\N	Lajang	HONORER	SMA2	Pakuwon City	GURU	GURU	Tidak	082233370742	\N	1996-01-31 00:00:00+07	\N
01059	ANDI KRISTIYONO	L	2016-08-05 00:00:00+07	\N	Menikah	HONORER	SMP1	Kupang Indah	GURU	GURU	Tidak	081554447949	\N	1974-02-07 00:00:00+07	\N
00773	YUNITA	P	2014-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	083831461070	yunita@gloriaschool.org	1982-07-09 00:00:00+07	FF  26  0F  E6
00743	MUTIARA SEKAR UTAMI	P	2014-03-03 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	081327106263	mutiara_sekar@gloriaschool.org	1991-03-06 00:00:00+07	1F  F6  17  E6
01725	RESHA GRACIKA SUSANTO	P	2025-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD4	Grand Pakuwon	GURU	GURU	Tidak	089602114973	resha_susanto@gloriaschool.org	1993-06-28 00:00:00+07	7F  07  16  E6
00301	SRI INDAYANI	P	2001-08-01 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	TATA USAHA	KARYAWAN	Tidak	\N	sri_indayani@gloriaschool.org	1967-06-24 00:00:00+07	\N
00368	BASUKI SUPRIYONO	L	1996-10-23 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	UMUM	KARYAWAN	Tidak	081330086980	\N	1960-01-30 00:00:00+07:30	\N
01352	ARISKA PINEM	P	2019-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	BIMBINGAN/KONSELING	GURU	Tidak	082242818720	ariska_pinem@gloriaschool.org	1993-06-10 00:00:00+07	\N
00081	DIAN EKARISTI, S.PD.	P	2010-02-16 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	\N	\N	1984-10-11 00:00:00+07	\N
00814	HANNA PRATIWI	P	2014-09-04 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	PERPUSTAKAAN	KARYAWAN	Tidak	087757053555	\N	1988-04-13 00:00:00+07	\N
01027	FRETTY JUNIARTI	P	2016-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	082276892253	\N	1993-06-06 00:00:00+07	\N
00705	JIMMY AFFANDY	L	2013-08-22 00:00:00+07	\N	Lajang	HONORER	SMA2	Pakuwon City	GURU	GURU	Tidak	083849808778	\N	1982-12-24 00:00:00+07	\N
00175	YENNY PUSPITASARI	P	2009-09-11 00:00:00+07	\N	Lajang	HONORER	SD3	Pakuwon City	GURU	GURU	Tidak	\N	\N	1986-07-16 00:00:00+07	\N
00795	NELLY YUNIATY SITORUS	P	2014-07-21 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	081515182526	\N	1988-06-28 00:00:00+07	\N
00278	ELISA KRISTIYANTI	P	2009-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	WAKIL KEPALA SEKOLAH	GURU	Tidak	\N	\N	1987-11-27 00:00:00+07	\N
01677	INDAH SEVIANITA	P	2024-09-17 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	OPERASIONAL SMP-SMA	KARYAWAN	Aktif	081330779047	indah_sevianita@gloriaschool.org	1983-09-03 00:00:00+07	3F  0C  15  E6
00132	DEWI DWIYANTI	P	1997-02-17 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Aktif	08121702234	dewi_dwiyanti@gloriaschool.org	1970-07-17 00:00:00+07	3F  48  0E  E6
00816	RANATA MILLIAN ATYANA	L	2014-09-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	LOGISTIK	KARYAWAN	Aktif	082232766906	ranata_millian@gloriaschool.org	1983-05-21 00:00:00+07	FF  33  0C  E6
00546	DHUDY WIBISONO	L	2012-08-01 00:00:00+07	\N	Menikah	-	YAYASAN	Pakuwon City	IT	KARYAWAN	Tidak	08155090565	\N	1981-09-27 00:00:00+07	\N
00744	ALBERT JEFRI BOTA	L	2014-02-27 00:00:00+07	\N	Lajang	HONORER	SMP2	Pakuwon City	GURU	GURU	Tidak	082132004661	\N	1985-05-19 00:00:00+07	\N
01508	JOHANNES UBAD BARUS	L	2022-03-22 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	GA	KARYAWAN	Aktif	081540055990	johannes_barus@gloriaschool.org	1990-10-29 00:00:00+07	9F  2B  14  E6
00786	HANDY DWI PURWANTO	L	2014-07-01 00:00:00+07	\N	Lajang	FULL TIME	UMUM	Kupang Indah	TEKNISI	KARYAWAN	Aktif	089675641705	handydwi0388@gmail.com	1988-03-22 00:00:00+07	\N
00941	RICKY YONARDI, GO	L	2015-09-07 00:00:00+07	\N	Lajang	FULL TIME	SD1	Pacar	BIMBINGAN/KONSELING	GURU	Tidak	082232101656	ricky_yonardi@gloriaschool.org	1993-07-26 00:00:00+07	\N
00273	DESANDREW	L	2010-08-01 00:00:00+07	\N	Lajang	HONORER	SMA1	Sukomanunggal	GURU	GURU	Tidak	\N	\N	1978-12-23 00:00:00+07	\N
01633	DEBORAH INDRIATI	P	2024-03-01 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	KEPALA SEKOLAH	GURU	Aktif	08121750822	deborah_indriati@gloriaschool.org	1963-10-15 00:00:00+07:30	1F  0A  0D  E6
00052	ELLA NOVANA RETNOSARI	P	2008-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Aktif	081216508026	ella_novana@gloriaschool.org	1981-11-25 00:00:00+07	7F  E7  12  E6
00906	THERESIA DIAN KUMALA	P	2015-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	085246167978	theresia_dian@gloriaschool.org	1992-03-24 00:00:00+07	\N
01429	HASPRITA RESTIAMANGASTUTI BORU MANGUNSONG	P	2020-07-06 00:00:00+07	\N	Lajang	PART TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	089676347837	hasprita_mangunsong@gloriaschool.org	1995-01-07 00:00:00+07	\N
00353	SAMUEL RUDY TAKALAPETA	L	2004-01-15 00:00:00+07	\N	Menikah	FULL TIME	SATPAM	Kupang Indah	SECURITY	KARYAWAN	Tidak	081357025430	\N	1982-07-06 00:00:00+07	\N
00643	CORNELIUS SEPTIADI KRISTIAWAN	L	2013-04-03 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	PENGEMBANGAN SDM	KARYAWAN	Aktif	089606073510	cornelius_kristiawan@gloriaschool.org	1985-09-04 00:00:00+07	5F  8B  13  E6
01483	LILIK KURNIAWAN	L	2021-08-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	088230464635	lilik_kurniawan@gloriaschool.org	1996-02-25 00:00:00+07	\N
80039	VEYGEL REVELINO NELWAN	L	2025-08-27 00:00:00+07	\N	Lajang	-	SMA2	Pakuwon City	NON PEGAWAI	NON PEGAWAI	Aktif	081234220478	\N	1995-11-23 00:00:00+07	\N
01702	GRACELA NATASHA LUAS	P	2025-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	BIMBINGAN/KONSELING	GURU	Aktif	082177061851	gracela_luas@gloriaschool.org	2000-12-19 00:00:00+07	DF  D1  16  E6
00481	YUANITA KRISTIANI	P	2011-07-28 00:00:00+07	\N	TBA	HONORER	SMP2	Pakuwon City	GURU	GURU	Tidak	081330590675	\N	1980-06-23 10:41:34+07	\N
01468	NITA AGNESIA PRANA PUTRI	P	2021-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	085755683577	nita_agnesia@gloriaschool.org	1999-08-16 00:00:00+07	\N
01553	KRISTIANTO EKO SAPUTRO	L	2022-11-15 00:00:00+07	\N	Lajang	HONORER	SMA2	Pakuwon City	GURU	GURU	Tidak	081216720682	christiansaputra749@gmail.com	1991-04-07 00:00:00+07	\N
00403	VANNY RATIH PUTRI	P	2008-10-15 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	HR	KARYAWAN	Aktif	081257756160	vanny_putri@gloriaschool.org	1981-11-23 00:00:00+07	7F  4A  0B  E6
00567	DICKY LUMINTO	L	2012-08-01 00:00:00+07	\N	Lajang	HONORER	SD3	Pakuwon City	GURU	GURU	Tidak	081939678000	\N	1990-04-25 00:00:00+07	\N
01013	HENDRI SANJAYA	L	2016-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	08563113101	hendri_sanjaya@gloriaschool.org	1985-08-02 00:00:00+07	BF  5C  0B  E6
00266	ANDREW ARIANTO, SE	L	2009-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	\N	\N	1985-05-23 00:00:00+07	\N
01026	MARIA VERONIKA WIRJAPUTRA	P	2016-07-01 00:00:00+07	\N	Lajang	PART TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	082139728203	\N	1993-03-06 00:00:00+07	\N
00984	CHRISTIAN JAYA FAJARENSA	L	2016-04-15 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	088801455501	\N	1985-12-31 00:00:00+07	\N
01438	CHRISTA AZALIA TEDJORAHARDJO	P	2020-08-01 00:00:00+07	\N	Lajang	HONORER	SD3	Pakuwon City	GURU	GURU	Tidak	085749166595	christa_azalia@gloriaschool.org	1995-11-12 00:00:00+07	\N
00203	MINTARIA BR BANGUN	P	2007-07-10 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Aktif	081331232325	mintaria_bangun@gloriaschool.org	1982-10-08 00:00:00+07	1F  C3  11  E6
00135	ELITHA ANDRIANI K	P	2010-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	085257353829	\N	1981-01-10 00:00:00+07	\N
00426	LENI CHANDRA	P	2010-11-15 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	\N	\N	1983-09-05 00:00:00+07	\N
00337	SUWARTI A	P	1995-07-21 00:00:00+07	\N	Menikah	FULL TIME	UMUM	Kupang Indah	KANTIN	KARYAWAN	Tidak	\N	\N	1952-06-30 00:00:00+07:30	\N
01544	INGGITA PRAMESTI AYUNINGTYAS	P	2022-09-19 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	082137471012	inggita_ayuningtyas@gloriaschool.org	1998-08-13 00:00:00+07	\N
01350	ERVIN SUJANTO	P	2019-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD1	Pacar	GURU	GURU	Aktif	08815078492	ervin_sujanto@gloriaschool.org	1973-04-17 00:00:00+07	5F  2A  17  E6
00750	MEGAWATI HUTASOIT	P	2014-07-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	081376666236	megawati_hutasoit@gloriaschool.org	1989-03-29 00:00:00+07	\N
01610	DANIEL SANTOSO SIDHARTA	L	2023-10-02 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	082132290793	daniel_sidharta@gloriaschool.org	1993-11-07 00:00:00+07	\N
00709	LANI DIANA LIM	P	2013-09-02 00:00:00+07	\N	Lajang	PART TIME	SD3	Pakuwon City	GURU	GURU	Tidak	081703121746	\N	1991-06-18 00:00:00+07	\N
00938	SUMARAH SURYANINGRUM	P	2015-08-18 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	085647316785	\N	1993-05-26 00:00:00+07	\N
00669	MUFTI DWIYANI	P	2013-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	SUSTER	KARYAWAN	Aktif	081703685509	Muftidwiyani21@gmail.com	1977-01-21 00:00:00+07	C6  67  07  1A
00420	EBENHEIZER YULIANTO KOREH RAGA	L	2010-10-01 00:00:00+07	\N	Menikah	-	UMUM	Kupang Indah	SOPIR	KARYAWAN	Tidak	\N	\N	1981-07-18 00:00:00+07	\N
00994	DENNY GREZZA CHRISTIANDY	L	2016-05-02 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	IT	KARYAWAN	Tidak	085704889986	\N	1986-06-08 00:00:00+07	\N
00702	ANDHI LAKSONO PUTRO	L	2013-08-19 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	081330928385	andhi_laksono@gloriaschool.org	1983-07-04 00:00:00+07	7F  2A  17  E6
90001	M ARIF	L	2015-08-10 00:00:00+07	\N	Lajang	FULL TIME	UMUM	Pacar	SOPIR	OUTSOURCING	Tidak	\N	\N	1995-09-25 00:00:00+07	\N
01070	ELISA KURNIASARI KOESNANTO	P	2016-09-29 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	081339338191	\N	1994-04-08 00:00:00+07	\N
00122	YOSI EKA MULYANINGSIH	P	2008-01-05 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	\N	\N	1980-10-05 00:00:00+07	\N
00083	DIANA MEITA ZAIN, SE	P	2009-07-15 00:00:00+07	\N	Lajang	PART TIME	SD2	Kupang Indah	GURU	GURU	Tidak	\N	\N	1975-05-04 00:00:00+07	\N
00106	MARIA PUJI ASTUTIK	P	2001-10-01 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	PERPUSTAKAAN	KARYAWAN	Aktif	\N	maria_astutik@gloriaschool.org	1980-03-16 00:00:00+07	BF  D7  0E  E6
01374	DIDIT KAMA ADI PUTRA	L	2019-08-30 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	081554670323	\N	1996-09-01 00:00:00+07	\N
00145	KRISTIN YULIANA	P	2008-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	TATA USAHA	KARYAWAN	Tidak	\N	\N	1986-07-06 00:00:00+07	\N
01321	ROBBY HARTONO	L	2019-07-01 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	INTERNAL AUDIT	KARYAWAN	Tidak	081252599889	\N	1987-12-02 00:00:00+07	\N
01012	CHRISTOPHER GANADHI THE	L	2016-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	082277999933	\N	1994-02-24 00:00:00+07	\N
80020	RICO ANDHIKA PERMANA	L	2025-07-01 00:00:00+07	\N	Lajang	-	SMP2	Pakuwon City	NON PEGAWAI	NON PEGAWAI	Aktif	089646897397	ricoandhika88@gmail.com	1988-11-02 00:00:00+07	\N
01096	EUNIKE DAMAY INDIRA CHRISTIAN	P	2017-03-15 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	081330609182	eunike_damay@gloriaschool.org	1993-05-01 00:00:00+07	FF  67  10  E6
01187	AGUS SURYADI	L	2018-01-16 00:00:00+07	\N	Lajang	HONORER	SD3	Pakuwon City	GURU	GURU	Tidak	082143185868	\N	1986-08-09 00:00:00+07	\N
00415	FALCAO CHRISDIAN IMANUEL	L	2010-08-02 00:00:00+07	\N	Lajang	HONORER	SMP2	Pakuwon City	GURU	GURU	Tidak	\N	\N	1987-06-07 00:00:00+07	\N
00622	MAYA VIRGINA	L	2013-01-07 00:00:00+07	\N	Menikah	PART TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	087851501565	\N	1981-09-04 00:00:00+07	\N
01008	BUDI SUSANTO	L	2016-07-01 00:00:00+07	\N	Menikah	PART TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	0816607734	\N	1980-11-12 00:00:00+07	\N
00105	MARIA INDRAWATI	P	2009-07-01 00:00:00+07	\N	Cerai	FULL TIME	SD2	Kupang Indah	TATA USAHA	KARYAWAN	Aktif	085655311812	maria_indrawati@gloriaschool.org	1986-02-20 00:00:00+07	1F  F2  0E  E6
01053	RUDI KURNIAWAN	L	2016-08-05 00:00:00+07	\N	Menikah	HONORER	SD3	Pakuwon City	GURU	GURU	Tidak	081331266771	rudikurniawan83@gmail.com	1983-07-28 00:00:00+07	\N
00277	DUWI RAHARJO	L	2006-08-15 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	081938483729	duwi_raharjo@gloriaschool.org	1966-07-17 00:00:00+07	5F  AA  14  E6
01015	SHINTA WINARTO TEJA KUSUMA,SE	L	2016-07-14 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	BID PMBL-LOG-GA	KARYAWAN	Aktif	085103790852	shinta_winarto@gloriaschool.org	1988-09-01 00:00:00+07	5F  29  18  E6
00225	ALFRED JOBEANTO	L	2006-09-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	GEMBALA SEKOLAH	KARYAWAN	Aktif	0816537714	alfred_jobeanto@gloriaschool.org	1977-05-18 00:00:00+07	3F  F2  14  E6
00104	MAMIK SRI HARTATIK	P	2000-02-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	\N	mamik_sri@gloriaschool.org	1972-09-08 00:00:00+07	7F  0C  0F  E6
00336	SRI SOEGIARTI	P	1998-08-01 00:00:00+07	\N	Menikah	FULL TIME	UMUM	Sukomanunggal	KANTIN	KARYAWAN	Tidak	\N	\N	1953-10-23 00:00:00+07:30	\N
01700	YEHEZKIEL WISNU ADI KRISTANTO	L	2025-04-07 00:00:00+07	\N	Lajang	FULL TIME	SMP3	Grand Pakuwon	TATA USAHA	KARYAWAN	Aktif	082231275253	yehezkiel_kristanto@gloriaschool.org	2001-11-02 00:00:00+07	FF  46  14  E6
01372	FELICIA SUNARYO	P	2019-08-23 00:00:00+07	\N	Menikah	PART TIME	YAYASAN	Kupang Indah	SEKRETARIS	KARYAWAN	Tidak	081333032158	\N	1990-01-09 00:00:00+07	\N
01305	HANA LISBETH PANJAITAN	P	2019-02-15 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	PERPUSTAKAAN	KARYAWAN	Tidak	082364995568	hana_panjaitan@gloriaschool.org	1994-02-19 00:00:00+07	\N
00360	YUSMANTO	L	2002-02-01 00:00:00+07	\N	Menikah	FULL TIME	SATPAM	Kupang Indah	SECURITY	KARYAWAN	Aktif	085335207331	ymanto83@gmail.com	1983-09-16 00:00:00+07	\N
00065	ROEPI	P	2011-01-04 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	SUSTER	KARYAWAN	Tidak	\N	\N	1955-05-16 00:00:00+07:30	\N
00808	RAGIL SIH GUMELAR	P	2014-11-05 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Aktif	08977469649	ragil_sih@gloriaschool.org	1991-06-13 00:00:00+07	3F  C6  0F  E6
01335	JOSHUA CHARLIE SANJAYA	L	2019-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	089607565542	joshua_sanjaya@gloriaschool.org	1996-01-29 00:00:00+07	\N
01457	CONNIE TANONE	P	2021-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD4	Grand Pakuwon	KEPALA SEKOLAH	GURU	Aktif	082132533388	connie_tanone@gloriaschool.org	1981-03-16 00:00:00+07	DF  F1  0E  E6
80005	RUTH STELLA NATHANIEL	P	2025-07-01 00:00:00+07	\N	Lajang	-	SD2	Kupang Indah	NON PEGAWAI	NON PEGAWAI	Aktif	08119430081	rthnatha@gmail.com	2000-02-17 00:00:00+07	\N
00677	INDAH SARASTUTI	P	2013-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	085799533354	\N	1987-04-18 00:00:00+07	\N
01698	SOELISTIJANI DARMAWATI	P	2025-03-21 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	\N	sulistiani_darmawati@gloriaschool.org	1965-03-21 00:00:00+07	\N
00613	ANDREAS YOSANTA	L	2012-12-06 00:00:00+07	\N	Lajang	FULL TIME	SD1	Pacar	TATA USAHA	KARYAWAN	Aktif	088805026250	andreas_yosanta@gloriaschool.org	1983-05-20 00:00:00+07	3F  90  0F  E6
01449	KEZIA TIATIRA ENDHY	P	2021-01-15 00:00:00+07	\N	Lajang	HONORER	SMP2	Pakuwon City	GURU	GURU	Tidak	083144484092	keziaendhy@gmail.com	1996-10-06 00:00:00+07	\N
00802	DEVI SYANE NATALIA MANAFE	P	2014-08-08 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	082330236410	\N	1987-12-19 00:00:00+07	\N
01197	LEONY YULIATI HARTAWAN	P	2018-04-16 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	085234782878	leony_yuliati@gloriaschool.org	1991-07-23 00:00:00+07	5F  5E  0C  E6
00100	LILY TJAHJANI ACHMAD JASIN	P	1997-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	KEPALA SEKOLAH	GURU	Aktif	082233293747	lily_tjahjani@gloriaschool.org	1974-01-10 00:00:00+07	1F  32  12  E6
01132	ALFA CHARISMA S. PELLO	L	2017-07-10 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	082140086766	\N	1988-06-03 00:00:00+07	\N
00243	KARTIKA WARDHANI	P	2010-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	\N	\N	1984-06-28 00:00:00+07	\N
00732	ABRAHAM RUDOLF DATUMBANUA	L	2014-01-03 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	IT	KARYAWAN	Tidak	081703296747	\N	1986-12-06 00:00:00+07	\N
00696	ALOYSIUS TJANDRA	L	2013-08-01 00:00:00+07	\N	Lajang	HONORER	SMP2	Pakuwon City	GURU	GURU	Tidak	088805149788	\N	1980-06-21 00:00:00+07	\N
80036	DEWI KUSUMAWATI ANGRIAWAN	P	2025-08-01 00:00:00+07	\N	Menikah	-	PGTK2	Kupang Indah	NON PEGAWAI	NON PEGAWAI	Aktif	085851213145	\N	1994-04-25 00:00:00+07	\N
01721	STEFFI DELF VENUS V BONGGA	P	2025-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD4	Grand Pakuwon	GURU	GURU	Aktif	085710554398	steffi_bongga@gloriaschool.org	1998-03-16 00:00:00+07	7F  A6  16  E6
01676	YOHANES WELFRED PRAJOGO	L	2024-09-02 00:00:00+07	\N	Lajang	HONORER	SMP1	Kupang Indah	GURU	GURU	Tidak	081249477207	yohaneswelfred@gmail.com	1981-07-25 00:00:00+07	\N
00681	IVAN BUDIMAN	L	2013-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	087852798582	\N	1982-01-18 00:00:00+07	\N
00787	FEBY MELINDA	P	2014-07-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	KOORDINATOR	KARYAWAN	Tidak	0811364221	feby_melinda@gloriaschool.org	1963-10-11 00:00:00+07:30	\N
00434	JOHN VICTOR TONDI	L	2011-04-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	GA	KARYAWAN	Aktif	081331024667	john_tondi@gloriaschool.org	1973-04-23 00:00:00+07	1F  CD  0B  E6
00637	MIEKE NOVIYANTI LIENARD	P	2013-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Aktif	081938476911	mieke_noviyanti@gloriaschool.org	1984-11-17 00:00:00+07	5F  93  0B  E6
00586	JESSICA FAUSTA TAMBAYONG	P	2012-10-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Tidak	082115557780	\N	1988-08-09 00:00:00+07	\N
00246	MIRA LUXITA SARI	P	2010-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	\N	\N	1982-05-09 00:00:00+07	\N
00990	FINANTI RAHAYU	P	2016-04-18 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	085733323050	finanti_rahayu@gloriaschool.org	1993-02-25 00:00:00+07	7F  F2  14  E6
01110	ANDREAS ADIPRASETYO	L	2017-05-04 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Tidak	082232863650	\N	1995-06-03 00:00:00+07	\N
00211	RUT SEPTIANA KHARISMA PUTRI, S.S.	P	2008-07-01 12:05:41+07	\N	Cerai	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	08563080840	rut_septiana@gloriaschool.org	1986-09-28 00:00:00+07	7F  55  17  E6
00803	IVAN BUDIMAN	L	2014-08-07 00:00:00+07	\N	Lajang	PART TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	087852798582	\N	1982-01-18 00:00:00+07	\N
01434	MATHILDA BONITA KIMBAL	P	2020-07-23 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	082230885709	mathilda_kimbal@gloriaschool.org	1990-04-25 00:00:00+07	\N
00475	FIFIT KURNIA	P	2011-07-12 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	SUSTER	KARYAWAN	Tidak	085330555669	\N	1985-02-07 00:00:00+07	\N
00522	HAPPY KUKILOWATI	P	2012-05-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	085654741477	\N	1986-12-06 00:00:00+07	\N
80035	DJONI BUDI SANTOSO TONGGENGBIO	L	2025-08-01 00:00:00+07	\N	Menikah	-	SD1	Pacar	NON PEGAWAI	NON PEGAWAI	Aktif	081235550280	\N	1966-12-20 00:00:00+07	\N
00311	MARIYANTO	L	1996-07-01 00:00:00+07	\N	Menikah	FULL TIME	UMUM	Kupang Indah	KEBERSIHAN	KARYAWAN	Tidak	089619343205	mariyanto17mei@gmail.com	1968-05-17 00:00:00+07	\N
01016	WARIH KRISTIANTO	L	2016-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	085865180701	warih_kristianto@gloriaschool.org	1989-09-14 00:00:00+07	\N
00839	ARINI LAKSMI PALUPI, S. SOS	P	2015-02-20 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	PERPUSTAKAAN	KARYAWAN	Aktif	087885842858	arini_palupi@gloriaschool.org	1987-11-19 00:00:00+07	7F  19  18  E6
00917	ANNIE TRIANTO	P	2015-07-27 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	TATA USAHA	KARYAWAN	Tidak	081233392388	\N	1978-08-08 00:00:00+07	\N
00270	CHRISTINE IMANDA	P	2008-06-11 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	TATA USAHA	KARYAWAN	Aktif	08121788498	christine_imanda@gloriaschool.org	1985-06-06 00:00:00+07	5F  C4  0C  E6
00882	ELZASS YANTI	P	2015-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	08990138717	\N	1990-05-26 00:00:00+07	\N
00708	KHRISTARINI MARIANA S.SOS	P	2013-09-30 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Aktif	081331565626	krista_rini@gloriaschool.org	1982-01-31 00:00:00+07	5F  F5  0B  E6
00720	SISKA INDRI PUSPITASARI	P	2013-10-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	TATA USAHA	KARYAWAN	Tidak	085645913894	\N	1988-02-04 00:00:00+07	\N
01079	SHERLY ANDRIANI	P	2017-01-04 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	TATA USAHA	KARYAWAN	Tidak	083874218820	\N	1994-09-23 00:00:00+07	\N
01514	ANGELIA INEKE SUMANA	P	2022-07-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	082230249296	angelia_sumana@gloriaschool.org	1998-04-16 00:00:00+07	\N
00200	LINA WULANDARI, S. S.	P	2008-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	085736775577	\N	1977-04-03 00:00:00+07	\N
01118	SERLYN CORNELIS DILA	P	2017-07-03 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Aktif	083857346996	serlyn_cornelis@gloriaschool.org	1995-09-17 00:00:00+07	5F  74  0C  E6
00148	LILY EKA SARI	P	2008-01-07 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	\N	\N	1972-07-17 00:00:00+07	\N
01216	KALEB NUGRAHA RIVA	L	2018-07-02 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	081341029689	kaleb_riva@gloriaschool.org	1989-07-08 00:00:00+07	\N
01461	YHUNANDA	L	2021-05-27 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	PERPUSTAKAAN	KARYAWAN	Tidak	083851295386	yhunanda@gloriaschool.org	1998-08-13 00:00:00+07	\N
00147	ITA ARIESTA	P	2004-08-18 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	KEPALA SEKOLAH	GURU	Aktif	083849534111	ita_ariesta@gloriaschool.org	1981-04-06 00:00:00+07	7F  A7  11  E6
00521	RIKA RACHMAWATI	P	2012-05-01 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	085649412030	\N	1987-03-10 00:00:00+07	\N
00181	DANU PRAWIRA, S. SI.	L	2008-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	WAKIL KEPALA SEKOLAH	GURU	Aktif	08563389797	danu_prawira@gloriaschool.org	1981-08-23 00:00:00+07	1F  D6  15  E6
01046	GLORIA APRILITA KARIMBA	P	2016-08-02 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	BIMBINGAN/KONSELING	GURU	Tidak	08194277037	\N	1988-04-20 00:00:00+07	\N
01057	AMIR HARTANU	L	2016-08-25 00:00:00+07	\N	Menikah	HONORER	SMP2	Pakuwon City	GURU	GURU	Tidak	082132764262	\N	1985-07-27 00:00:00+07	\N
01699	PHILIA CANDRA SEKAR	P	2025-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMP3	Grand Pakuwon	GURU	GURU	Aktif	089692661650	philia_sekar@gloriaschool.org	1998-07-10 00:00:00+07	FF  14  17  E6
00073	AGUS SETIJONO	L	1998-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	088210816332	agus_setijono@gloriaschool.org	1964-07-30 00:00:00+07	\N
00490	TIKY PUSPA DEWI	P	2011-08-13 00:00:00+07	\N	Menikah	HONORER	SMP1	Kupang Indah	GURU	GURU	Tidak	\N	\N	1976-09-17 00:00:00+07	\N
00029	MARIA SETIYO PERTIWI	P	2007-01-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	081234801985	maria_pertiwi@gloriaschool.org	1972-09-02 00:00:00+07	5F  7E  17  E6
00794	SILANTORO NUGROHO	L	2014-07-17 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	085540000211	silantoro_nugroho@gloriaschool.org	1988-02-15 00:00:00+07	\N
00362	ARIES TRI GOENAWAN	L	2003-12-09 00:00:00+07	\N	Menikah	FULL TIME	UMUM	Kupang Indah	SOPIR	KARYAWAN	Aktif	\N	arsangun7@gmail.com	1972-05-16 00:00:00+07	\N
00662	GANDA GABRIEL	L	2013-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	WAKIL KEPALA SEKOLAH	GURU	Aktif	085852994595	ganda_gabriel@gloriaschool.org	1985-07-27 00:00:00+07	FF  E6  10  E6
00619	MARTHIN RUL	L	2013-01-07 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	GURU	KARYAWAN	Tidak	085275566807	marthin_rul@gloriaschool.org	1957-10-31 00:00:00+07:30	\N
00214	SONDANG LUCYANA SITOHANG	P	1997-08-06 00:00:00+07	\N	Cerai	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Aktif	082143533747	lucyana_sitohang@gloriaschool.org	1973-11-24 00:00:00+07	1F  7D  16  E6
00373	SADINO HADIWIJOYO	L	2013-04-15 00:00:00+07	\N	Menikah	FULL TIME	UMUM	Kupang Indah	TEKNISI	KARYAWAN	Tidak	081330045812	\N	1958-04-02 00:00:00+07:30	\N
01102	SHIRLEEN GIANINA OENTOENG	P	2017-04-03 00:00:00+07	\N	Lajang	FULL TIME	PGTK1	Pacar	GURU	GURU	Tidak	087852772232	\N	1995-04-06 00:00:00+07	\N
01062	YOHANA CHRISTINA WIDHIGDO	P	2016-09-01 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	KEUANGAN	KARYAWAN	Tidak	082139827756	\N	1994-04-19 00:00:00+07	\N
01346	VINA JAYANTI	P	2019-07-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	085336092148	vina_jayanti@gloriaschool.org	1996-01-28 00:00:00+07	\N
00658	GIOVANNI ELISHA MARKALI	L	2013-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	087853902595	giovanni_elisha@gloriaschool.org	1983-02-12 00:00:00+07	FF  D7  0E  E6
01255	SHEILLA KRISTANTI ANGGONO	P	2018-12-03 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	085855529516	sheilla_anggono@gloriaschool.org	1993-01-06 00:00:00+07	\N
01162	DAVID ALEXANDER ADEN	L	2017-10-01 00:00:00+07	\N	Menikah	HONORER	SMA2	Pakuwon City	GURU	GURU	Tidak	081553599368	davidaden84.daa@gmail.com	1978-04-08 00:00:00+07	\N
00955	DWI KRISTIANTO	L	2016-01-05 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	BIMBINGAN/KONSELING	GURU	Aktif	081575481753	dwi_kristianto@gloriaschool.org	1990-06-20 00:00:00+07	FF  54  13  E6
00187	DRA. NARSIYAH	P	1997-07-14 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	081330451950	narsiyah@gloriaschool.org	1965-07-27 00:00:00+07	FF  8B  11  E6
01050	CINDY AGNES JONATHAN	P	2016-08-01 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	0811333102	\N	1994-02-04 00:00:00+07	\N
00755	EKA SISWANTI	P	2014-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	085741600304	eka_siswanti@gloriaschool.org	1991-02-13 00:00:00+07	7F  E7  10  E6
00028	LUSY KUSUMAWATI,SE	P	2006-07-18 00:00:00+07	\N	Lajang	FULL TIME	SD1	Pacar	GURU	GURU	Tidak	\N	\N	1984-09-08 00:00:00+07	\N
01646	IMANUEL FAJAR TRIJANTO	L	2024-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	081227423158	imanuel_trijanto@gloriaschool.org	1996-09-01 00:00:00+07	3F  18  10  E6
01444	ELLYATA GRACESIHLAH SETIAWAN	P	2020-08-24 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	085331450548	ellyata_setiawan@gloriaschool.org	1993-10-30 00:00:00+07	\N
00489	HENDRA	L	2011-11-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	IT	KARYAWAN	Aktif	081803212031	hendra@gloriaschool.org	1983-05-31 00:00:00+07	FF  A5  16  E6
00835	JUHERTI ARTIMI LIU	P	2015-01-05 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	SUSTER	KARYAWAN	Aktif	081216907937	juherti.artimi93@gmail.com	1993-07-17 00:00:00+07	96  6B  DA  19
00107	MELIANA ERAWATI	P	2010-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	\N	\N	1981-05-12 00:00:00+07	\N
01029	AGUS TINUS	L	2016-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	082330035883	\N	1983-10-27 00:00:00+07	\N
00873	CLAUDYA TIO ELLEOSSA	P	2015-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	08883554665	\N	1992-07-12 00:00:00+07	\N
01040	NOVITA ALAMSYAH	P	2016-07-15 00:00:00+07	\N	Lajang	PART TIME	SD2	Kupang Indah	GURU	GURU	Tidak	083874934939	\N	1974-11-08 00:00:00+07	\N
00601	LUCY FAJARNINGROEM	P	2012-11-01 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	085732198888	\N	1980-05-22 00:00:00+07	\N
01367	HENRY NOVIRGA TANDYO	L	2019-08-15 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	INTERNAL AUDIT	KARYAWAN	Aktif	085655705707	henry_tandyo@gloriaschool.org	1991-11-05 00:00:00+07	FF  3F  15  E6
00447	IRMA LIMENA	P	2011-07-01 00:00:00+07	\N	Lajang	PART TIME	SD3	Pakuwon City	GURU	GURU	Tidak	085649444414	\N	1984-11-17 00:00:00+07	\N
00189	MURDO WIBOWO, DRS	L	2000-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	085232529600	murdo_wibowo@gloriaschool.org	1964-12-21 00:00:00+07	\N
00901	HENGKY BAMBANG	L	2015-07-06 00:00:00+07	\N	Lajang	PART TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	08155100055	\N	1986-10-17 00:00:00+07	\N
01682	ABISAG NANDA ADI KRISTI	P	2025-01-06 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	KURIKULUM SMP-SMA	KARYAWAN	Tidak	081358679910	abisag_kristi@gloriaschool.org	1999-12-03 00:00:00+07	\N
00224	AGUNG SAPTO JATMIKO	L	2009-04-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	TATA USAHA	KARYAWAN	Aktif	\N	agung_jatmiko@gloriaschool.org	1980-01-24 00:00:00+07	FF  2B  14  E6
00215	SUMARYADI, SM. TH.	L	1996-08-02 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	TATA USAHA	KARYAWAN	Tidak	\N	\N	1958-03-05 00:00:00+07:30	\N
00858	LIBERTIN GEA	P	2015-03-23 00:00:00+07	\N	Menikah	FULL TIME	PGTK1	Pacar	GURU	GURU	Aktif	081362151262	libertin_gea@gloriaschool.org	1989-05-29 00:00:00+07	5F  CB  10  E6
00234	ELISABETH PURWANTI, S.PD	P	2008-08-01 00:00:00+07	\N	Menikah	PART TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	085732561195	\N	1977-01-16 00:00:00+07	\N
80009	EDDY SUBYAKTO	L	2025-07-01 00:00:00+07	\N	Menikah	-	SD3	Pakuwon City	NON PEGAWAI	NON PEGAWAI	Aktif	081326844271	Eddysubyakto@gmail.com	1966-08-05 00:00:00+07	\N
00334	PARTI	P	1995-06-15 00:00:00+07	\N	Menikah	FULL TIME	UMUM	Kupang Indah	KANTIN	KARYAWAN	Tidak	\N	\N	1951-06-30 00:00:00+07:30	\N
01066	AMELIA ONGKODJOJO	P	2016-09-08 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	BIMBINGAN/KONSELING	GURU	Tidak	089667973553	amelia_ongkodjojo@gloriaschool.org	1991-04-12 00:00:00+07	\N
00530	VIDIA ARUM MANJANI	P	2012-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	085745911370	\N	1991-04-02 00:00:00+07	\N
00967	SUN GABRIELLA ADINDA SUNUR	P	2016-02-10 00:00:00+07	\N	Lajang	HONORER	SMA1	Sukomanunggal	GURU	GURU	Tidak	082221034838	\N	1992-01-03 00:00:00+07	\N
00001	ADRYANA ALBERTIN	P	2009-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK1	Pacar	GURU	GURU	Aktif	082247797118	adryana_albertin@gloriaschool.org	1981-04-23 00:00:00+07	FF  60  14  E6
00701	ERAFID MOARDHIKA	L	2013-07-20 00:00:00+07	\N	Menikah	HONORER	SMP1	Kupang Indah	GURU	GURU	Tidak	085731779155	\N	1986-05-15 00:00:00+07	\N
00087	DYANNE PARAMITA,S.SI	P	2009-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	\N	dyanne_paramita@gloriaschool.org	1980-07-06 00:00:00+07	BF  48  18  E6
00813	SUNARDI	L	2014-08-18 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	TEKNISI	KARYAWAN	Tidak	\N	\N	1959-08-09 00:00:00+07:30	\N
01713	ITA VERAWATI SOESILO	P	2025-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	08977212148	ita_verawati@gloriaschool.org	1995-08-10 00:00:00+07	5F  94  14  E6
00317	SUGIONO	L	1995-08-01 00:00:00+07	\N	Menikah	FULL TIME	UMUM	Kupang Indah	KEBERSIHAN	KARYAWAN	Tidak	\N	\N	1955-06-30 00:00:00+07:30	\N
00957	GOGO PRAYOGO	L	2016-01-04 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	08562838008	\N	1991-08-03 00:00:00+07	\N
80006	L.R. IMMANUEL KOTAMBONAN	L	2025-07-01 00:00:00+07	\N	Menikah	-	SD2	Kupang Indah	NON PEGAWAI	NON PEGAWAI	Aktif	08973999339	ralemsy.29@gmail.com	1985-05-29 00:00:00+07	\N
00676	FRANSISCA DYAH WINI JULIAWATI	P	2013-07-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	UNIT USAHA	KARYAWAN	Tidak	085649030966	\N	1986-07-15 00:00:00+07	\N
01126	ANGELA CICILIA WIJAYA	P	2017-07-03 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	KURIKULUM KBTK-SD	KARYAWAN	Aktif	0895366869381	angela_cicilia@gloriaschool.org	1974-07-02 00:00:00+07	DF  72  15  E6
00341	MAKSI MANANGKA	L	2007-04-09 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Sukomanunggal	SECURITY	KARYAWAN	Aktif	081332123607	maximanangka@gmail.com	1977-03-01 00:00:00+07	\N
01655	PINVATANIS DORENJE GEA	P	2024-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Aktif	081212673352	pinvatanis_gea@gloriaschool.org	1993-07-01 00:00:00+07	1F  A6  16  E6
01022	MAURIN YANUARU	P	2016-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	081332039408	maurin_yanuaru@gloriaschool.org	1979-03-07 00:00:00+07	BF  0C  0F  E6
00095	GUNIAWATI	P	1996-09-15 00:00:00+07	\N	Lajang	HONORER	SD2	Kupang Indah	GURU	GURU	Tidak	087851722177	\N	1968-12-29 00:00:00+07	\N
01231	NARDI SISWANTO	L	2018-08-01 00:00:00+07	\N	Menikah	HONORER	PGTK3	Pakuwon City	GURU	GURU	Tidak	081332840711	nardisiswanto241980@gmail.com	1980-04-02 00:00:00+07	\N
00390	JUNITA FRICILLIA TANJUNG	P	2010-03-08 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	HR	KARYAWAN	Tidak	08175113880	\N	1981-06-04 00:00:00+07	\N
00125	ANGGI PUSPITASARI	P	2009-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	SUSTER	KARYAWAN	Tidak	085655661060	\N	1988-01-20 00:00:00+07	\N
00282	FERAWATI, SE	P	2003-01-07 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	\N	\N	1980-03-15 00:00:00+07	\N
00150	LELLY MADASARI	P	2010-07-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	SUSTER	KARYAWAN	Tidak	081931081822	\N	1989-07-13 00:00:00+07	\N
00457	VERA YULIAWATI	P	2011-07-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Aktif	\N	vera_yuliawati@gloriaschool.org	1983-07-13 00:00:00+07	BF  48  0C  E6
01518	JONATHAN ALVINO	L	2022-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	081916327799	jonathan_alvino@gloriaschool.org	1999-03-21 00:00:00+07	1F  3A  11  E6
01505	NATASYA BINTANG ANDRIYANTI ROBERTO	P	2022-02-15 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	081234220615	natasya_roberto@gloriaschool.org	1993-07-21 00:00:00+07	\N
00753	BOBBY GIVANKA	L	2014-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	085285348648	\N	1990-11-24 00:00:00+07	\N
01601	DEBORA OKTAVIA	P	2023-07-31 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	AKUNTING	KARYAWAN	Tidak	\N	debora_oktavia@gloriaschool.org	1999-10-31 00:00:00+07	\N
00314	SITI JUARIYAH	P	2008-12-09 00:00:00+07	\N	Menikah	-	UMUM	Kupang Indah	KEBERSIHAN	GURU	Tidak	\N	\N	1968-10-10 00:00:00+07	\N
01384	CALVIN VENDREDI WIBISONO	L	2019-11-04 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	089684838114	calvin_vendredi@gloriaschool.org	1997-08-02 00:00:00+07	\N
01528	WILYANA	P	2022-07-04 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	08165419406	wilyana@gloriaschool.org	1981-03-21 00:00:00+07	\N
00620	EKO PURWANTO	L	2013-01-07 00:00:00+07	\N	Menikah	FULL TIME	UMUM	Pakuwon City	TEKNISI	KARYAWAN	Tidak	085730502435	\N	1978-05-16 00:00:00+07	\N
00024	LIEM RAFAEL SEBASTIAN	L	1997-07-01 00:00:00+07	\N	Menikah	PART TIME	SD1	Pacar	GURU	GURU	Tidak	\N	\N	1960-10-19 00:00:00+07:30	\N
00923	VINCENSIUS	L	2015-08-04 00:00:00+07	\N	Lajang	PART TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	081281812836	\N	1989-07-04 00:00:00+07	\N
01320	PUTRI INA AYU SARTIKA	P	2019-06-15 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	TATA USAHA	KARYAWAN	Aktif	082233363927	putri_sartika@gloriaschool.org	1992-10-27 00:00:00+07	9F  5C  0F  E6
01366	KEVIN SUSANTO POKHAN	L	2019-08-13 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Aktif	082232535738	kevin_pokhan@gloriaschool.org	1996-06-06 00:00:00+07	7F  1F  16  E6
01009	YOHANES KRISTIAN WIBOWO	L	2016-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	081515734131	\N	1988-10-25 00:00:00+07	\N
00756	YOHANES ALVIN GOENAWAN	L	2014-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	085749409822	yohanes_alvin@gloriaschool.org	1992-07-15 00:00:00+07	\N
00535	MARHAENDRA KRIS CANDRA	L	2012-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	081703429600	\N	1988-07-28 00:00:00+07	\N
80003	DAVID SUSANTO	L	2025-07-01 00:00:00+07	\N	Menikah	-	PGTK2	Kupang Indah	NON PEGAWAI	NON PEGAWAI	Aktif	\N	davidsusanto60@gmail.com	1973-07-05 00:00:00+07	\N
01644	JESSICA THEODORA ALEXANDRA.F	P	2024-05-27 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	087851336699	jessica_alexandra@gloriaschool.org	1995-02-03 00:00:00+07	\N
01574	NATASHA AMANDA	P	2023-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	085730340110	natasha_amanda@gloriaschool.org	1995-12-12 00:00:00+07	\N
00891	YOSEF CHRISTIAWAN	L	2015-07-03 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Aktif	081333307730	yosef_christiawan@gloriaschool.org	1984-12-27 00:00:00+07	9F  37  16  E6
01344	BERNARDA PUTRI WULANDARI	P	2019-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD1	Pacar	PERPUSTAKAAN	KARYAWAN	Aktif	085648583088	bernarda_wulandari@gloriaschool.org	1996-08-08 00:00:00+07	7F  14  17  E6
01112	OVY SETIOWATIE SETIO	P	2017-06-02 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	TATA USAHA	KARYAWAN	Aktif	089679723515	ovy_setio@gloriaschool.org	1990-10-17 00:00:00+07	7F  90  0F  E6
00271	CORRY SURJAWAN	P	2007-05-03 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	KURIKULUM SMP-SMA	KARYAWAN	Aktif	0818334131	corry_surjawan@gloriaschool.org	1982-12-17 00:00:00+07	1F  70  13  E6
00910	DIEGO ALFONSO SKHURAVIJZ	L	2015-07-08 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	WAKIL KEPALA SEKOLAH	GURU	Aktif	081335405070	diego_alfonso@gloriaschool.org	1992-10-30 00:00:00+07	BF  71  11  E6
01427	LASARUS SETYO PAMUNGKAS	L	2020-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	081332320711	lasarus_setyo@gloriaschool.org	1987-04-15 00:00:00+07	BF  90  0F  E6
01439	SIBYL ROZELLA SOETEDJA	P	2020-08-01 00:00:00+07	\N	Lajang	HONORER	SD3	Pakuwon City	GURU	GURU	Tidak	081294911990	Sibylrozella@yahoo.com	1990-04-10 00:00:00+07	\N
00579	ERIC BIMO	L	2012-09-01 00:00:00+07	\N	Lajang	PART TIME	SD3	Pakuwon City	GURU	GURU	Tidak	0818312696	\N	1982-11-09 14:11:34+07	\N
00058	LANNY MULIYANI, S.PSI	P	2010-07-12 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Tidak	\N	\N	1983-01-27 00:00:00+07	\N
00690	DIAH ANDIKA RINI	P	2013-07-19 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	081392719991	\N	1985-11-29 00:00:00+07	\N
00185	DINA SUTRA	P	2009-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	\N	\N	1983-04-14 00:00:00+07	\N
00227	ANTHONY RUDOLF PATTY	L	2009-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	'081336166668	anthony_rudolf@gloriaschool.org	1982-11-02 00:00:00+07	BF  46  14  E6
00565	NENCI SETYANINGRUM,S.PD.	P	2012-08-02 00:00:00+07	\N	Menikah	FULL TIME	PGTK1	Pacar	GURU	GURU	Aktif	087855588270	nenci_setyaningrum@gloriaschool.org	1978-09-27 00:00:00+07	FF  32  10  E6
01129	FRANSISCA NOVA YULIANA BORU TINAMBUNAN	P	2017-07-03 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	085729020309	fransisca_nova@gloriaschool.org	1994-07-13 00:00:00+07	FF  50  0D  E6
00788	AL HADID AMMASH	L	2014-07-01 00:00:00+07	\N	Lajang	HONORER	SMA1	Sukomanunggal	GURU	GURU	Tidak	081938300610	alhadidammash@gmail.com	1988-09-11 00:00:00+07	\N
01257	LIBERTHA MASRIKAT	P	2019-01-03 00:00:00+07	\N	Lajang	FULL TIME	SD1	Pacar	GURU	GURU	Tidak	082335242587	libertha_masrikat@gloriaschool.org	1987-08-14 00:00:00+07	\N
01722	FIDE EDNO	L	2025-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	BIMBINGAN/KONSELING	GURU	Aktif	082337782261	fide_edno@gloriaschool.org	1991-10-27 00:00:00+07	3F  BB  16  E6
00331	NGATIYEM	P	1998-07-15 00:00:00+07	\N	Menikah	FULL TIME	UMUM	Kupang Indah	KANTIN	KARYAWAN	Tidak	\N	\N	1955-06-30 00:00:00+07:30	\N
01502	FRAN SISIANA	P	2022-01-02 00:00:00+07	\N	Lajang	PART TIME	YAYASAN	Kupang Indah	MISI DIAKONIA DAN KEROHANIAN	KARYAWAN	Tidak	089619189940	fran_sisiana@gloriaschool.org	1984-09-16 00:00:00+07	\N
00210	RR. INTAN CAHYANI PUTRI, A. MD.	P	2009-08-18 00:00:00+07	\N	Lajang	-	SMP1	Kupang Indah	PERPUSTAKAAN	KARYAWAN	Tidak	\N	\N	1987-03-22 00:00:00+07	\N
00053	EMI INDRIATI	P	2001-01-08 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Aktif	\N	emi_indriati@gloriaschool.org	1975-05-01 00:00:00+07	3F  9B  12  E6
00520	PANDU EDDY WICAKSONO	L	2012-05-15 00:00:00+07	\N	TBA	FULL TIME	SMP1	Kupang Indah	TATA USAHA	KARYAWAN	Tidak	\N	\N	1986-07-19 00:00:00+07	\N
01014	EVY WIBISONO	P	2016-07-01 00:00:00+07	\N	Menikah	PART TIME	SD3	Pakuwon City	GURU	GURU	Aktif	082233158199	evy_wibisono@gloriaschool.org	1984-02-29 00:00:00+07	\N
00752	YENNY PUSPITASARI	P	2014-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	081703357277	yenny_puspitasari@gloriaschool.org	1986-07-16 00:00:00+07	7F  26  15  E6
01661	ARIN ADE KRISTANTI	P	2024-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	085740999134	arin_kristanti@gloriaschool.org	1995-10-15 00:00:00+07	5F  83  12  E6
00303	SUSILO HARTINI	P	2010-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	085648511775	soesilo_hartini@gloriaschool.org	1968-01-11 00:00:00+07	7F  D1  16  E6
01447	ARDINA ANGGIE CHRISTANTIE	P	2020-11-16 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	TATA USAHA	KARYAWAN	Aktif	081336559901	ardina_christantie@gloriaschool.org	1996-03-12 00:00:00+07	BF  37  16  E6
00231	DEBORAH INDRIATI	P	2000-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	KEPALA SEKOLAH	GURU	Tidak	08121750822	deborah_indriati@gloriaschool.org	1963-10-15 00:00:00+07:30	\N
01316	YOHAN NUGROHO SUPARNO	L	2019-04-01 00:00:00+07	\N	Menikah	FULL TIME	SD1	Pacar	GURU	GURU	Aktif	081392912656	yohan_suparno@gloriaschool.org	1990-06-05 00:00:00+07	BF  75  0F  E6
01144	YONAS SAPUTRA	L	2017-08-01 00:00:00+07	\N	Lajang	HONORER	SD3	Pakuwon City	GURU	GURU	Tidak	089682499441	yonazputra06@gmail.com	1985-09-06 00:00:00+07	\N
01503	PAULINA SIGIT	P	2022-01-17 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Pakuwon City	OPERASIONAL SMP-SMA	KARYAWAN	Aktif	085335477955	paulina_sigit@gloriaschool.org	1990-07-18 00:00:00+07	3F  F6  13  E6
00042	YERMIA TRI PUTRI	P	2008-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD1	Pacar	GURU	GURU	Aktif	083121240363	yermia_tri@gloriaschool.org	1975-06-17 00:00:00+07	BF  B3  12  E6
80002	JULLY PANGGAWEAN	P	2025-07-01 00:00:00+07	\N	Menikah	-	SD1	Pacar	NON PEGAWAI	NON PEGAWAI	Aktif	087852643800	jullyphe91@gmail.com	1972-07-12 00:00:00+07	\N
00180	BUDHI CHRISTIADI	L	2002-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	081331290807	budhi_christiadi@gloriaschool.org	1976-11-21 00:00:00+07	3F  7A  18  E6
00968	DESSY SALAMPESSY, SE.	P	2016-02-22 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	TATA USAHA	KARYAWAN	Tidak	08121678458	\N	1982-11-16 00:00:00+07	\N
00051	ELIS SETYANI	P	2002-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Aktif	08179306423	elis_setyani@gloriaschool.org	1976-09-04 00:00:00+07	5F  F2  0C  E6
00169	SULISTIJOWATI	P	2004-07-15 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	SUSTER	KARYAWAN	Aktif	\N	sulistijowati1970@gmail.com	1970-11-22 00:00:00+07	46  1B  D7  19
00218	TJIOE ALICIA MEITA SARI	P	2010-07-19 00:00:00+07	\N	Lajang	HONORER	SMP1	Kupang Indah	GURU	GURU	Tidak	\N	\N	1989-05-22 00:00:00+07	\N
00300	SHERLY DEASY ANJUWITA GULTOM,,S.SOS	P	2006-08-01 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	081230771655	sherly_deasy@gloriaschool.org	1981-12-07 00:00:00+07	\N
01378	ALVIN YUSTIAN SAPUTRA	L	2019-09-30 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	08113123120	alvin_saputra@gloriaschool.org	1994-10-31 00:00:00+07	\N
01437	YEFTA GAVRA GARLAND PERSADA	L	2020-08-01 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	GA	KARYAWAN	Tidak	082234900029	yefta_persada@gloriaschool.org	1993-10-22 00:00:00+07	\N
00176	YESSICA FINIKE MARSELI, S.PD	P	2010-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	081330683757	yessica_finike@gloriaschool.org	1985-06-25 00:00:00+07	BF  0C  15  E6
00437	RUTH IRAWATI	P	2011-05-02 00:00:00+07	\N	Menikah	-	YAYASAN	Kupang Indah	PEMBELIAN	KARYAWAN	Tidak	087853637337	\N	1984-03-29 00:00:00+07	\N
80028	JOSHUA ABNER RAMIREZ	L	2025-07-01 00:00:00+07	\N	Lajang	-	SMA2	Pakuwon City	NON PEGAWAI	NON PEGAWAI	Aktif	085694818677	\N	2002-07-06 00:00:00+07	\N
00067	SHERLY YUVITA, S.PD	P	2006-08-14 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Tidak	\N	\N	1983-01-07 00:00:00+07	\N
01245	ARMY DINASTY	L	2018-09-17 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	081332071705	army_dinasty@gloriaschool.org	1996-07-31 00:00:00+07	\N
00739	AMI PRAMUDIANA	P	2014-02-03 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PENGEMBANGAN SDM	KARYAWAN	Tidak	085648000969	\N	1984-05-14 00:00:00+07	\N
01701	ELVA RETTA CLARA SOLLY	P	2025-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	081803307710	elva_solly@gloriaschool.org	1997-07-28 00:00:00+07	9F  91  16  E6
01256	SALLY	P	2019-01-03 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Tidak	082132022282	\N	1996-03-05 00:00:00+07	\N
00324	JUMI'AH	P	2002-04-01 00:00:00+07	\N	Menikah	FULL TIME	UMUM	Kupang Indah	KANTIN	KARYAWAN	Aktif	\N	Jumiah435@gmail.com	1971-09-21 00:00:00+07	\N
00678	OLIVE SIDHARTA	P	2013-07-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	085851505335	\N	1979-06-06 00:00:00+07	\N
00949	ELRIN IMANIAR SUGIANTO	P	2015-10-15 00:00:00+07	\N	Menikah	PART TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	082139395185	\N	1991-08-18 00:00:00+07	\N
00511	IKE MARIA SINANDANG	P	2012-02-16 00:00:00+07	\N	Lajang	PART TIME	SD1	Pacar	GURU	GURU	Aktif	081331428808	ike_maria@gloriaschool.org	1980-08-12 00:00:00+07	\N
00438	ANNE LUCKVIANNY	P	2011-05-02 00:00:00+07	\N	Lajang	-	YAYASAN	Kupang Indah	AKUNTING	KARYAWAN	Tidak	08175200989	\N	1989-09-20 00:00:00+07	\N
01462	LIDYA ANGELINA	P	2021-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	082237325387	lydia_angelina@gloriaschool.org	1998-01-05 00:00:00+07	\N
01569	WONG MILKA ELSAFAN	P	2023-02-19 00:00:00+07	\N	Menikah	FULL TIME	SD1	Pacar	GURU	GURU	Tidak	0818505105	wong_milka@gloriaschool.org	1963-02-18 00:00:00+07:30	\N
00075	BOEDI HANDAJANI	P	1996-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	WAKIL KEPALA SEKOLAH	GURU	Aktif	\N	boedi_handajani@gloriaschool.org	1970-07-18 00:00:00+07	BF  69  12  E6
00076	CHRISSIE EVERT SAKALESSIA	P	2010-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	WAKIL KEPALA SEKOLAH	GURU	Aktif	081330222107	chrissie_evert@gloriaschool.org	1986-11-07 00:00:00+07	9F  16  12  E6
00879	MILA PRESCILLA PRAYITNO	P	2015-07-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	087852257345	\N	1993-07-27 00:00:00+07	\N
01304	ANTONIUS ARI SUKMA HARDIANA	L	2019-02-11 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	085790217537	antonius_ari@gloriaschool.org	1985-05-02 00:00:00+07	7F  8C  0E  E6
01300	MONICA HARTONO	P	2019-01-18 00:00:00+07	\N	Lajang	HONORER	SMP1	Kupang Indah	GURU	GURU	Tidak	082140640012	monica.hartono93@gmail.com	1993-04-24 00:00:00+07	\N
00226	ALOYSIUS SULISTYANTO	L	2010-01-06 00:00:00+07	\N	Menikah	PART TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	\N	\N	1975-01-30 00:00:00+07	\N
00573	YOSSY MARTHALIA DEWI	P	2012-09-26 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	BIMBINGAN/KONSELING	GURU	Tidak	081804597000	\N	1985-03-26 00:00:00+07	\N
01182	ROSALINA SITORUS	P	2018-01-15 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	085875229969	\N	1994-06-04 00:00:00+07	\N
00809	HANNY KURNIAWAN ADISTANA	L	2014-08-15 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	081330265769	\N	1983-12-20 00:00:00+07	\N
90009	BASUKI	L	2022-07-01 00:00:00+07	\N	Menikah	-	YAYASAN	Kupang Indah	UMUM	OUTSOURCING	Tidak	\N	\N	2000-01-01 00:00:00+07	\N
00892	JEFFERSON SURYAWAN LIJADI	L	2015-07-03 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	081703702815	\N	1988-12-15 00:00:00+07	\N
01554	CRISTHANANTA SINDORO,S.I.KOM.,M.H.	L	2022-12-01 00:00:00+07	\N	Lajang	FULL TIME	SD1	Pacar	GURU	GURU	Tidak	085155025251	cristhananta_sindoro@gloriaschool.org	1998-07-23 00:00:00+07	\N
00488	JACQUELINE CHANDRA	P	2011-09-14 00:00:00+07	\N	TBA	HONORER	SMA2	Pakuwon City	GURU	GURU	Tidak	087853323555	\N	1988-10-17 11:18:36+07	\N
01616	EUNIKE PUTRI ANNEL	P	2023-10-30 00:00:00+07	\N	Lajang	FULL TIME	SD1	Pacar	PERPUSTAKAAN	KARYAWAN	Tidak	085161364314	eunike_annel@gloriaschool.org	2001-09-30 00:00:00+07	\N
00291	LEILLA CLAUDYA INDRIASARI	P	1999-08-02 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	PERPUSTAKAAN	KARYAWAN	Tidak	\N	leilla_indriasari@gloriaschool.org	1974-12-13 00:00:00+07	\N
00408	YOSVIEN SINCE SURA, SE	P	2006-09-02 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	KEUANGAN	KARYAWAN	Aktif	081332257122	yosvien_sura@gloriaschool.org	1977-02-25 00:00:00+07	FF  06  16  E6
01115	ARDIANTO PANDAPOTAN SIREGAR	L	2017-07-03 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	085297481400	ardianto_pandapotan@gloriaschool.org	1992-01-30 00:00:00+07	9F  75  0E  E6
01531	EDDY SUBYAKTO	L	2022-07-25 00:00:00+07	\N	Menikah	HONORER	SD3	Pakuwon City	GURU	GURU	Tidak	081326844271	Eddysubyakto@gmail.com	1966-08-05 00:00:00+07	\N
00204	MINTUK HARTINI	P	1997-08-01 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	PERPUSTAKAAN	GURU	Tidak	\N	\N	1957-12-05 00:00:00+07:30	\N
01546	DAVID ALEXANDER ADEN	L	2022-09-05 00:00:00+07	\N	Menikah	HONORER	SMA2	Pakuwon City	GURU	GURU	Tidak	081553599368	davidaden84.daa@gmail.com	1978-04-08 00:00:00+07	\N
00070	WAHYU ARUMNINGTYAS	P	1998-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Aktif	081330621948	wahyu_arumningtyas@gloriaschool.org	1972-07-23 00:00:00+07	9F  80  0B  E6
00789	ABREDIA LIMANAGO	P	2012-07-16 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	0818332348	\N	1975-08-08 00:00:00+07	\N
00575	DENNI TRESNA CAHYADI	L	2012-09-15 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	KEUANGAN	KARYAWAN	Tidak	085648999621	\N	1989-05-18 00:00:00+07	\N
00412	ELISE YOUNG	P	2010-08-06 00:00:00+07	\N	Lajang	HONORER	SD3	Pakuwon City	GURU	GURU	Tidak	\N	\N	1978-10-28 00:00:00+07	\N
01067	YOHANNA ASTUTI PURWANINGTYAS	P	2016-09-13 00:00:00+07	\N	Menikah	PART TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	0818326232	\N	1956-05-16 00:00:00+07:30	\N
01406	DENNY ARDIAN FRISDIARTA	L	2020-06-08 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	IT	KARYAWAN	Tidak	085655290323	denny_frisdiarta@gloriaschool.org	1991-04-06 00:00:00+07	\N
00296	OTTO WIBISONO	L	2010-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	08175051839	\N	1985-06-15 00:00:00+07	\N
01204	THERESIA DEWI	P	2018-07-02 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	0816521908	theresia_dewi@gloriaschool.org	1976-05-21 00:00:00+07	1F  94  14  E6
01478	NATALIE PUSPITA	P	2021-08-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	BIMBINGAN/KONSELING	GURU	Tidak	\N	natalie_puspita@gloriaschool.org	1998-12-23 00:00:00+07	\N
00142	INDIRA LO ANGGRAINI	P	2007-08-09 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	\N	\N	1982-09-24 00:00:00+07	\N
00130	D. TRINGATMINI	P	1986-01-22 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Aktif	081231520340	debora_tringatmini@gloriaschool.org	1966-01-09 00:00:00+07	5F  8C  0E  E6
00120	YOHANA SRI PANGLIPURINGTYAS	P	1999-08-18 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	\N	yohana_sri@gloriaschool.org	1974-12-05 00:00:00+07	DF  97  10  E6
01608	EKY LIDYA CONSTANTINA	P	2023-08-29 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Aktif	083857020142	eky_constantina@gloriaschool.org	1991-02-21 00:00:00+07	7F  5E  0C  E6
00495	ADI PRANATA	L	2011-10-01 00:00:00+07	\N	TBA	PART TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	085732619234	\N	1988-10-18 00:00:00+07	\N
00371	KAMSURI	L	1995-07-26 00:00:00+07	\N	Menikah	FULL TIME	UMUM	Kupang Indah	TEKNISI	KARYAWAN	Tidak	\N	\N	1966-06-04 00:00:00+07	\N
00939	NOVA WULANDARIE SIRAIT	P	2015-09-07 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	TATA USAHA	KARYAWAN	Tidak	081357004354	\N	1986-11-14 00:00:00+07	\N
00140	FRANSISCA VIVI LIPURO	P	2010-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	SUSTER	GURU	Tidak	\N	\N	1980-01-25 00:00:00+07	\N
00515	ELIZA KURNIAWATI WIDJAJA	P	2012-03-26 00:00:00+07	\N	TBA	-	YAYASAN	Kupang Indah	KEUANGAN	KARYAWAN	Tidak	\N	\N	1984-05-04 00:00:00+07	\N
00355	STEFANUS KUMAN	L	2002-07-06 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	SECURITY	KARYAWAN	Aktif	081230614591	stefanuskuman01@gmail.com	1974-06-03 00:00:00+07	\N
80023	DAVID ALEXANDER ADEN	L	2025-07-01 00:00:00+07	\N	Menikah	-	SMA2	Pakuwon City	NON PEGAWAI	NON PEGAWAI	Aktif	081553599368	davidaden84.daa@gmail.com	1978-04-08 00:00:00+07	\N
00330	MUNASIH	P	2002-04-23 00:00:00+07	\N	Menikah	FULL TIME	UMUM	Pacar	KANTIN	KARYAWAN	Tidak	085730099763	nilamuun@gmail.com	1968-10-10 00:00:00+07	\N
01194	MISHELLA NAFTALIE GUNAWAN	P	2018-04-03 00:00:00+07	\N	Lajang	PART TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	087852623939	mishella_gunawan@gloriaschool.org	1995-12-08 00:00:00+07	DC  C0  BD  D3
01035	MARIA GRACE SILIA MONIKA SARI	P	2016-07-15 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Aktif	\N	maria_grace@gloriaschool.org	1990-07-17 11:16:40+07	5F  16  12  E6
01376	JOHANES NOVENTA NUGROHO	L	2019-09-11 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	081330099096	johanes_noventa@gloriaschool.org	1996-07-18 00:00:00+07	\N
01235	JEREMY MELVIN LUNTUNGAN	L	2018-08-06 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	082233370742	jeremy_luntungan@gloriaschool.org	1996-01-31 00:00:00+07	\N
00394	MARCELLIA RIVENA	P	1998-06-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Sukomanunggal	UNIT USAHA	KARYAWAN	Tidak	081330892618	\N	1960-03-20 00:00:00+07:30	\N
01345	RECKY SUSANTI	P	2019-06-24 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	0895631776002	\N	1995-04-09 00:00:00+07	\N
90025	KANGO LUKITO	L	2024-09-01 00:00:00+07	\N	Menikah	-	YAYASAN	Kupang Indah	MISI DIAKONIA DAN KEROHANIAN	OUTSOURCING	Aktif	\N	\N	1945-09-01 00:00:00+09	55  83  3F  B1
01065	LYDIA LOUISE TEDJOSUKMONO	P	2016-09-06 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	081703165565	lydia_louise@gloriaschool.org	1993-03-24 00:00:00+07	\N
00886	DIANA RUMANTIR	P	2015-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	08123251181	diana_rumantir@gloriaschool.org	1981-10-17 00:00:00+07	FF  31  12  E6
00517	EVELYNE SUSANTO	P	2012-04-12 00:00:00+07	\N	Lajang	HONORER	SMP2	Pakuwon City	GURU	GURU	Tidak	08385555217	\N	1987-03-24 00:00:00+07	\N
01190	ANDRIYANI DEA WULANDARI	P	2018-03-01 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	085858644196	andriyani_dea@gloriaschool.org	1997-02-14 00:00:00+07	\N
00084	DITA KUMALA DEWI A.R.	P	2005-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	WAKIL KEPALA SEKOLAH	GURU	Aktif	081217601118	dita_kumala@gloriaschool.org	1981-12-10 00:00:00+07	7F  91  16  E6
00461	WIDYANTI SUGIANTO	P	2011-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	\N	\N	1986-09-28 00:00:00+07	\N
00603	RUDDY LIERA KUSUMA	L	2012-10-31 00:00:00+07	\N	Lajang	HONORER	SMA2	Pakuwon City	GURU	GURU	Tidak	081703275878	\N	1975-06-04 00:00:00+07	\N
01327	SELLY MONICA AULIA	P	2019-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	081333434411	selly_monica@gloriaschool.org	1994-07-11 00:00:00+07	\N
00178	AKWILA AGUNG KRISTIONO	L	2002-08-26 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	TATA USAHA	KARYAWAN	Tidak	\N	\N	1979-06-02 00:00:00+07	\N
01113	JANUAR SIMORANGKIR	L	2017-07-03 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	081231203995	januar_simorangkir@gloriaschool.org	1988-01-03 00:00:00+07	\N
00626	FEBBY ANASTASYA SISWANDINI	P	2013-02-11 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	SUSTER	KARYAWAN	Tidak	082257048201	\N	1980-02-25 00:00:00+07	\N
01210	GUSTI ADITYA	L	2018-07-02 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	081336032947	gusti_aditya@gloriaschool.org	1987-08-07 00:00:00+07	\N
00783	TIARA SETYO KUSUMAWARDANI	P	2014-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	081233188852	\N	1991-03-19 00:00:00+07	\N
00361	AFIF RULLY AFANDI	L	2010-02-05 00:00:00+07	\N	Menikah	FULL TIME	UMUM	Pakuwon City	SOPIR	KARYAWAN	Tidak	\N	\N	1983-07-15 00:00:00+07	\N
00828	ROMAULI NAINGGOLAN	P	2014-09-30 00:00:00+07	\N	Menikah	PART TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	081335512053	\N	1977-11-17 00:00:00+07	\N
90021	FLORENTIA OLIVIA DERMAWAN SETIA BUDI	P	2023-09-01 00:00:00+07	\N	Lajang	-	PGTK3	Pakuwon City	GURU	OUTSOURCING	Tidak	\N	\N	1945-08-17 00:00:00+09	\N
01536	VIDIA ARUM MANJANI	P	2022-09-01 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	081330184136	vidia_manjani@gloriaschool.org	1991-04-02 00:00:00+07	\N
00570	GUSTI AYU HANNY SANTHYAWATI	P	2012-08-27 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	BIMBINGAN/KONSELING	GURU	Tidak	085850586631	\N	1984-08-19 00:00:00+07	\N
00381	HANDAJANI KRISNAWATI	P	2000-07-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	KOORDINATOR	KARYAWAN	Tidak	08165402322	\N	1949-06-07 00:00:00+08	\N
00247	NATALIA PUJIHARIASRI	P	2006-11-26 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	TATA USAHA	KARYAWAN	Tidak	\N	\N	1976-12-26 00:00:00+07	\N
01120	RESA KRISTINA	P	2017-07-03 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	BIMBINGAN/KONSELING	GURU	Aktif	085743192660	resa_kristina@gloriaschool.org	1993-06-05 00:00:00+07	DF  41  0F  E6
90012	HOSEA	L	2022-07-01 00:00:00+07	\N	Lajang	-	UMUM	Kupang Indah	SOPIR	OUTSOURCING	Tidak	\N	\N	2000-01-01 00:00:00+07	\N
01623	GRISCIPTA YOSEFANITA	P	2024-01-03 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	081216138116	griscipta_yosefanita@gloriaschool.org	2000-07-21 00:00:00+07	5F  F2  0E  E6
01142	WIRADINATA PESIK	L	2017-07-31 00:00:00+07	\N	Lajang	PART TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	081703445900	\N	1983-11-19 00:00:00+07	\N
00680	JUANTA MEMORY SEBAYANG	L	2013-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	082124159413	\N	1985-01-14 00:00:00+07	\N
00454	RIRIL LIA CETRIANA	P	2011-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	081931043004	\N	1980-02-28 00:00:00+07	\N
01363	AGUS TINUS	L	2019-08-01 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	082330035883	agus_tinus@gloriaschool.org	1983-10-27 00:00:00+07	DF  EE  15  E6
01358	HOKGIARTO WITARSO	L	2019-08-01 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	IT	KARYAWAN	Tidak	08123070345	hokgiarto_witarso@gloriaschool.org	1989-04-28 00:00:00+07	\N
01613	RUTH MADELEINE RUBBA	P	2023-10-17 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	081252783382	ruth_rubba@gloriaschool.org	1997-06-04 00:00:00+07	\N
01642	ALBERT ARDEN	L	2024-05-02 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	GA	KARYAWAN	Aktif	083849235019	albert_arden@gloriaschool.org	1998-05-19 00:00:00+07	7F  37  16  E6
01010	AGUNG KUNCARA	L	2016-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	082231293123	agung_kuncara@gloriaschool.org	1980-10-29 00:00:00+07	9F  55  17  E6
01313	PRADIPTA HUTAMA WIDODO	L	2019-03-15 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	TATA USAHA	KARYAWAN	Tidak	083831504450	pradipta_widodo@gloriaschool.org	1995-07-01 00:00:00+07	\N
01612	FELIX FEBRIANTO	L	2023-10-09 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	GA	KARYAWAN	Aktif	0895631273867	felix_febrianto@gloriaschool.org	2001-02-06 00:00:00+07	5F  8C  15  E6
01485	GAYU WIBIYANTI	P	2021-08-01 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	BIMBINGAN/KONSELING	GURU	Aktif	08980737270	gayu_wibiyanti@gloriaschool.org	1994-10-04 00:00:00+07	BF  A3  0E  E6
01627	AGATHA CHRISTIE	P	2024-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	082141088011	agatha_christie@gloriaschool.org	1999-03-24 00:00:00+07	1F  DB  13  E6
00444	YENKEY INDAHWATI HUI	P	2011-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	081803271984	\N	1984-08-27 00:00:00+07	\N
00921	KARTIKASARI	P	2015-07-28 00:00:00+07	\N	Menikah	PART TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	081326531990	\N	1982-04-21 00:00:00+07	\N
00848	DIAN ANGGRAINI	P	2015-03-02 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	PERPUSTAKAAN	KARYAWAN	Aktif	085731003720	dian_anggraini@gloriaschool.org	1986-07-21 00:00:00+07	BF  59  15  E6
01140	JOSHUA LUKITO	L	2017-07-25 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	081334408473	joshua_lukito@gloriaschool.org	1995-05-13 00:00:00+07	\N
00483	DIANE SOSELISA	P	2011-08-05 00:00:00+07	\N	Menikah	HONORER	SMP1	Kupang Indah	GURU	GURU	Tidak	085648467377	dianesoselisa@gmail.com	1986-02-07 11:10:56+07	\N
01665	ZELZA ADININGSIH	P	2024-07-04 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	089649027489	zelza_adiningsih@gloriaschool.org	2001-12-19 00:00:00+07	7F  15  0E  E6
00793	YULIA CHRISTIANTI LIEMENA	P	2014-08-01 00:00:00+07	\N	Menikah	HONORER	PGTK3	Pakuwon City	GURU	GURU	Tidak	087751151532	yulia.liemena@gmail.com	1985-07-31 00:00:00+07	\N
01399	LUKAS	L	2020-04-21 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Pakuwon City	GA	KARYAWAN	Tidak	08566147111	lukas@gloriaschool.org	1991-10-28 00:00:00+07	\N
01353	MELIANA	P	2019-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	085257780014	meliana@gloriaschool.org	1997-05-27 00:00:00+07	9F  AA  14  E6
01506	XARISTA EUNICE ALFANADHA MUSTIKA	P	2022-03-07 00:00:00+07	\N	Lajang	FULL TIME	SD4	Grand Pakuwon	TATA USAHA	KARYAWAN	Tidak	085156673258	xarista_mustika@gloriaschool.org	1999-09-30 00:00:00+07	\N
01471	IGNATIUS WIDI SETYAWAN	L	2021-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD4	Grand Pakuwon	GURU	GURU	Aktif	088224811754	widi_setyawan@gloriaschool.org	1974-05-26 00:00:00+07	7F  09  0C  E6
00757	FLORENTINE LINDA AGUSTINA	P	2014-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	081547212078	\N	1988-08-29 00:00:00+07	\N
00244	KRISTINA DIAN INDAHWINARNI	P	2009-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	\N	kristina_dian@gloriaschool.org	1984-04-02 00:00:00+07	7F  CB  10  E6
00037	TRISUTA NGUDI RAHARJA	L	2002-07-17 00:00:00+07	\N	Menikah	FULL TIME	SD1	Pacar	WAKIL KEPALA SEKOLAH	GURU	Aktif	0811310744	trisuta_raharja@gloriaschool.org	1978-06-26 00:00:00+07	7F  7B  14  E6
01343	SAHRONI PONCO WIBOWO	L	2019-07-18 00:00:00+07	\N	Menikah	HONORER	SD1	Pacar	GURU	GURU	Tidak	081216445006	sahroni_ponco@gloriaschool.org	1976-07-02 00:00:00+07	\N
90028	GALIH AYU PRABADARI	P	2025-01-02 00:00:00+07	\N	Lajang	-	YAYASAN	Kupang Indah	SUSTER	OUTSOURCING	Aktif	\N	\N	1945-08-15 00:00:00+09	46  6C  66  1A
00960	DIDIK WITONO	L	2016-01-08 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	PERPUSTAKAAN	KARYAWAN	Tidak	08137060633	\N	1965-01-11 00:00:00+07	\N
00453	BUNGA DEWANTI	P	2011-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD1	Pacar	GURU	GURU	Aktif	082140437967	bunga_dewanti@gloriaschool.org	1988-06-01 00:00:00+07	5F  41  0F  E6
01479	JOSHUA CHARLIE SANJAYA	L	2021-08-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	089607565542	joshua_sanjaya@gloriaschool.org	1996-01-29 00:00:00+07	\N
01549	PRISKILA ATALIA SANJAYA	P	2022-10-17 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	82231658060	priskila_sanjaya@gloriaschool.org	1995-02-10 00:00:00+07	\N
01614	BAGAS LANTIP PRAKASA	L	2023-10-16 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	081327619993	bagas_prakasa@gloriaschool.org	1994-05-20 00:00:00+07	\N
00335	SAMU	P	2001-06-15 00:00:00+07	\N	Menikah	FULL TIME	UMUM	Kupang Indah	KANTIN	KARYAWAN	Aktif	\N	samusurabaya@gmail.com	1974-04-07 00:00:00+07	\N
01314	JOSHUA CHRISTIAN PRAWIRO	L	2019-03-21 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	081805487439	joshua_prawiro@gloriaschool.org	1995-01-09 00:00:00+07	\N
00700	STEPHANIE DEVI ARTEMISIA	P	2013-08-01 00:00:00+07	\N	Menikah	HONORER	SD3	Pakuwon City	GURU	GURU	Tidak	08123102306	\N	1977-03-09 00:00:00+07	\N
00043	YOEL PALINGGI	L	2010-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	081217017384	yoel_palinggi@gloriaschool.org	1983-02-12 00:00:00+07	\N
01720	ELIZABETH CINDY CLAUDYA	P	2025-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	BIMBINGAN/KONSELING	GURU	Aktif	082230465378	elizabeth_claudya@gloriaschool.org	1999-06-26 00:00:00+07	DF  2A  17  E6
01432	NUKE EVA NOVITA	P	2020-07-20 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	08113548155	nuke_novita@gloriaschool.org	1995-11-16 00:00:00+07	DF  74  0C  E6
00333	PAINAH	P	1997-07-15 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	KANTIN	KARYAWAN	Tidak	\N	\N	1964-09-17 00:00:00+07	\N
01025	PAULINE PINKAN PANTAUW	P	2016-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	BIMBINGAN/KONSELING	GURU	Tidak	087877799678	\N	1991-09-28 00:00:00+07	\N
00162	RINA MAGDALENA	P	2010-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Aktif	081334037132	rina_magdalena@gloriaschool.org	1978-04-12 00:00:00+07	5F  D1  16  E6
00197	KRISTIANI GINTARTI	P	2003-07-14 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Aktif	08121716254	kristiani_gintarti@gloriaschool.org	1980-03-05 00:00:00+07	1F  83  12  E6
00915	MERYANA CENDANANINGSIH	P	2015-07-27 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	08886739870	\N	1980-03-27 00:00:00+07	\N
01634	NOFRIANI ELISABETH TAKMANU	P	2024-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	085280516914	nofriani_takmanu@gloriaschool.org	1994-09-16 00:00:00+07	FF  08  18  E6
80025	TIMOTHY KRISNADI	L	2025-07-01 00:00:00+07	\N	Lajang	-	SMA2	Pakuwon City	NON PEGAWAI	NON PEGAWAI	Aktif	081232727570	timothykrisnadi@gmail.com	2001-01-04 00:00:00+07	\N
00133	EMMY TRISNAWATI	P	2008-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	SUSTER	KARYAWAN	Aktif	\N	emitrisnawati0705@gmail.com	1979-05-07 00:00:00+07	A6  4A  D7  19
01442	CHRISTINE FEBRIYANTI	P	2020-08-12 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	081324540143	christine_febriyanti@gloriaschool.org	1998-02-07 00:00:00+07	\N
01523	FRICYLIA	P	2022-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	082238663173	fricylia@gloriaschool.org	1997-08-15 00:00:00+07	\N
00851	SHANTI HERMAWAN	P	2015-03-02 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	085232073050	shanti_hermawan@gloriaschool.org	1983-09-13 00:00:00+07	\N
00881	TANGKAS PRIAMBODO	L	2015-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	081232644102	\N	1990-06-30 00:00:00+07	\N
00357	SUDI WALUYO	L	2000-02-14 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	SECURITY	KARYAWAN	Tidak	085233419280	\N	1964-03-05 00:00:00+07	\N
00999	ANGELIA ENDAR PUTRI	P	2016-05-23 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Sukomanunggal	PERPUSTAKAAN	KARYAWAN	Tidak	087798384044	\N	1995-07-04 00:00:00+07	\N
00853	WISYE TRIE YULIANTI MUSKANANFOLA	P	2015-03-16 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	BIMBINGAN/KONSELING	GURU	Tidak	082232341013	\N	1992-07-03 00:00:00+07	\N
01407	ALFA CHARISMA SARJONO PELLO	L	2020-06-02 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	KURIKULUM SMP-SMA	KARYAWAN	Tidak	081281653806	alfa_pello@gloriaschool.org	1988-06-03 00:00:00+07	\N
00319	SUSILO BUDHY	L	1996-02-26 00:00:00+07	\N	Cerai	FULL TIME	UMUM	Kupang Indah	KEBERSIHAN	KARYAWAN	Tidak	\N	\N	1957-12-09 00:00:00+07:30	\N
00054	EMMY LAELIYAH	P	1998-08-30 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Tidak	\N	\N	1965-11-25 00:00:00+07	\N
00998	HENDRA PANDU SATRIA	L	2016-05-16 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	TATA USAHA	KARYAWAN	Aktif	081230725138	hendra_satria@gloriaschool.org	1982-11-15 00:00:00+07	FF  C4  0C  E6
00143	INDRAWATI	P	2005-06-15 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	\N	\N	1980-12-20 00:00:00+07	\N
00485	HOSEA ERICKSON	L	2011-07-23 00:00:00+07	\N	TBA	HONORER	SMP2	Pakuwon City	GURU	GURU	Tidak	8563440990	\N	1992-10-19 00:00:00+07	\N
00497	ONY WAHYUDIANTARO	L	2011-12-01 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	085648120091	ony_wahyudiantaro@gloriaschool.org	1988-08-02 00:00:00+07	\N
00653	MARIANAWATY BUDIANTO	P	2013-05-06 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	KEUANGAN	KARYAWAN	Tidak	081803053285	marianawaty_budianto@gloriaschool.org	1991-03-21 00:00:00+07	\N
01017	VICY DILLY YULIA RATNA SARI	P	2016-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	081331113216	\N	1985-07-06 00:00:00+07	\N
01509	BOBBY HARTONO	L	2022-04-19 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	081366389470	bobby_hartono@gloriaschool.org	1996-11-07 00:00:00+07	1F  DF  11  E6
00707	WELYAM SAPUTRA LIM	L	2013-08-20 00:00:00+07	\N	Lajang	HONORER	SMA2	Pakuwon City	GURU	GURU	Tidak	083849333055	\N	1988-12-24 00:00:00+07	\N
00423	DANANG DWI WIJAYANTO	L	2010-11-01 00:00:00+07	\N	Lajang	-	SD2	Kupang Indah	TATA USAHA	KARYAWAN	Tidak	\N	\N	1984-09-26 00:00:00+07	\N
00484	YOHAN TARYONO WIDODO, SE.	L	2012-08-01 00:00:00+07	\N	Menikah	HONORER	SMP2	Kupang Indah	GURU	GURU	Tidak	08155025937	yohantaryono_widodo@yahoo.com	1980-11-29 00:00:00+07	\N
00655	NOVITA ANGRENGGANI PUSPITASARI	P	2013-05-01 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	UNIT USAHA	KARYAWAN	Tidak	085236941694	\N	1989-11-23 00:00:00+07	\N
01369	RYKSA WAHYU ANGGRAENI	P	2019-08-19 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	081334117672	ryksa_anggraeni@gloriaschool.org	1996-05-23 00:00:00+07	1F  7C  14  E6
00378	DANIEL DWI RAHARJO	L	2009-12-10 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	AKUNTING	KARYAWAN	Tidak	\N	\N	1984-02-22 00:00:00+07	\N
00759	ANGELINA ARIYANTI SUTIJONO	P	2014-07-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	085752796402	\N	1992-05-29 00:00:00+07	\N
00804	KUSNU WIDODO	L	2014-07-21 00:00:00+07	\N	Menikah	HONORER	SMP2	Pakuwon City	GURU	GURU	Tidak	08121734801	\N	1972-12-27 00:00:00+07	\N
00650	MICHELLE PURWAGANI	P	2013-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	WAKIL KEPALA SEKOLAH	GURU	Aktif	08993716248	michelle_purwagani@gloriaschool.org	1990-04-06 00:00:00+07	BF  1E  11  E6
00596	YANUAR SULISTYONO HADI	L	2012-11-12 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	IT	KARYAWAN	Tidak	085640052322	yanuar_sulistyono@gloriaschool.org	1989-01-04 10:16:53+07	\N
00896	FRANSISKUS TOMMY DIAN SAPUTRA	L	2015-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	082132214791	fransiskus_tommy@gloriaschool.org	1989-12-20 00:00:00+07	3F  E8  16  E6
01097	FREDYASTUTI ANDRYANA. M.PD	P	2017-03-15 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	085700056839	fredyastuti_andryana@gloriaschool.org	1988-10-15 00:00:00+07	FF  9A  12  E6
90020	ANGELINA IMMACULATA MARVIN	P	2023-09-01 00:00:00+07	\N	Lajang	-	PGTK3	Pakuwon City	GURU	OUTSOURCING	Tidak	\N	\N	1945-08-17 00:00:00+09	\N
00025	LIM TIEN	P	2001-01-08 00:00:00+07	\N	Menikah	FULL TIME	SD1	Pacar	KEPALA SEKOLAH	GURU	Aktif	08165436639	liem_tien@gloriaschool.org	1976-12-02 00:00:00+07	DF  48  0C  E6
00740	SEMAYA ELIZABETH WIDODO	P	2014-02-05 00:00:00+07	\N	Lajang	HONORER	SMA2	Pakuwon City	GURU	GURU	Tidak	081991970988	\N	1989-09-23 15:45:23+07	\N
01476	JOSHUA HASIAN LUMBAN RAJA	L	2021-07-21 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	IT	KARYAWAN	Tidak	081232433022	joshua_lumbanraja@gloriaschool.org	1999-07-22 00:00:00+07	\N
01543	SAI DONG, , SM.TH, S.PSI	L	2022-08-06 00:00:00+07	\N	Menikah	HONORER	SMP1	Kupang Indah	GURU	GURU	Tidak	08123195912	coachdong123@gmail.com	1969-08-16 00:00:00+07	\N
90005	FRANKY APOLOS	L	2022-07-01 00:00:00+07	\N	Lajang	-	YAYASAN	Kupang Indah	UMUM	OUTSOURCING	Tidak	\N	\N	2000-01-01 00:00:00+07	\N
01534	THABITA ANGELITA	P	2022-08-09 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Aktif	81330354247	thabita_angelita@gloriaschool.org	1996-08-14 00:00:00+07	9F  EE  15  E6
00417	PRANATA SANTOSO	L	2010-08-02 00:00:00+07	\N	Lajang	HONORER	SMA2	Pakuwon City	GURU	GURU	Tidak	\N	\N	1982-10-01 00:00:00+07	\N
00261	TIWI PURWANINGTYAS,S.PD	P	1996-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Aktif	\N	tiwi_purwaningtyas@gloriaschool.org	1968-09-05 00:00:00+07	7F  67  16  E6
00491	VICTOR INDRA PRAMANA	L	2011-08-08 00:00:00+07	\N	TBA	HONORER	SMA2	Pakuwon City	GURU	GURU	Tidak	081703304723	\N	1989-02-23 13:21:46+07	\N
00925	SYLVIA SIDHARTA	P	2015-07-28 00:00:00+07	\N	Menikah	HONORER	SD2	Kupang Indah	GURU	GURU	Tidak	\N	\N	1978-06-24 00:00:00+07	\N
00844	VIVIN NOVALINA KRISTIANI	P	2015-02-23 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	AKUNTING	KARYAWAN	Tidak	081325612299	\N	1987-01-04 00:00:00+07	\N
80021	KRISTI WANANTRA	L	2025-07-01 00:00:00+07	\N	Menikah	-	SMP2	Pakuwon City	NON PEGAWAI	NON PEGAWAI	Aktif	087786368842	johannezkristi86@gmail.com	1986-09-10 00:00:00+07	\N
00332	NURIKAH	P	2005-12-01 00:00:00+07	\N	Menikah	FULL TIME	UMUM	Sukomanunggal	KANTIN	KARYAWAN	Tidak	\N	\N	1957-08-17 00:00:00+07:30	\N
00182	CANDRA WIJAYA AMARTA	L	2008-07-01 13:26:59+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	085335021355	candra_wijaya@gloriaschool.org	1984-06-13 00:00:00+07	5F  26  15  E6
00063	PAULU AGUSTINE KURNIAWAN	P	2007-07-24 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Tidak	\N	\N	1984-08-14 00:00:00+07	\N
01359	LUISA VERDIANA SANTOSO	P	2019-08-01 00:00:00+07	\N	Lajang	HONORER	PGTK2	Kupang Indah	GURU	GURU	Tidak	08175279989	luisa7497@gmail.com	1997-04-07 00:00:00+07	\N
01011	MARGARET HUSADA	P	2016-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	0816503451	margaret_husada@gloriaschool.org	1987-12-31 00:00:00+07	\N
00918	SAFITRI AYU LESTARI	P	2015-07-27 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	SUSTER	KARYAWAN	Tidak	\N	safitriay@gmail.com	1996-10-16 00:00:00+07	\N
00865	HANNA MEYLITASARI	P	2015-04-22 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	KEUANGAN	KARYAWAN	Tidak	085749949213	hanna_meylitasari@gloriaschool.org	1993-05-21 00:00:00+07	\N
01526	IRENE JESSICA GUNAWAN	P	2022-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	081331824881	irene_gunawan@gloriaschool.org	2000-04-22 00:00:00+07	\N
01098	ESTERINA APRILIANI ELISA	P	2017-03-15 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	085648489902	esterina_apriliani@gloriaschool.org	1995-04-16 00:00:00+07	9F  7F  10  E6
00866	DENNY KUSUMA	L	2015-04-27 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	TATA USAHA	KARYAWAN	Tidak	\N	\N	1992-05-22 00:00:00+07	\N
01466	HANNA TRISNO	P	2021-07-01 00:00:00+07	\N	Lajang	PART TIME	SD1	Pacar	GURU	GURU	Tidak	081331348152	hanna_trisno@gloriaschool.org	1986-08-28 00:00:00+07	\N
01117	NUGRAHENI WIDIASTUTI	P	2017-07-03 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	085743733704	\N	1993-05-15 00:00:00+07	\N
00255	SANDRA SOPUTRA	P	2010-07-12 00:00:00+07	\N	Menikah	PART TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	\N	\N	1978-08-25 00:00:00+07	\N
00048	DHIANTI ANGGRAENY, S.E	P	1998-08-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Tidak	0878527244446	\N	1978-08-06 00:00:00+07	\N
00864	KRISTIAWAN AGUNG NUGROHO	L	2015-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	088809713804	\N	1991-06-06 00:00:00+07	\N
00687	FERDINAN DYAN WARUDU	L	2013-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	089617556420	\N	1992-01-08 00:00:00+07	\N
01383	EUNIKE TABITA SURONO	P	2019-10-28 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	0895364807611	eunike_surono@gloriaschool.org	1996-12-07 00:00:00+07	\N
90011	DHERY	L	2022-07-01 00:00:00+07	\N	Lajang	-	YAYASAN	Kupang Indah	UMUM	OUTSOURCING	Tidak	\N	\N	2000-01-01 00:00:00+07	\N
01639	MANUELLA LOVENSA DELFARONA.M	P	2024-05-28 00:00:00+07	\N	Lajang	PART TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	088223988879	manuella_delfarona@gloriaschool.org	1992-06-23 00:00:00+07	\N
01188	SOEKARDI THEDJOISWORO	L	2018-02-21 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	KOORDINATOR	KARYAWAN	Aktif	081230333433	soekardi_thedjoisworo@gloriaschool.org	1963-09-20 00:00:00+07:30	7F  E3  0D  E6
00597	DEVI IRAWATI	P	2012-11-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	PERPUSTAKAAN	KARYAWAN	Tidak	085710163119	\N	1984-12-21 00:00:00+07	\N
00621	R.SLAMET DWIRAHARDJO	L	2013-01-07 00:00:00+07	\N	Menikah	FULL TIME	UMUM	Pakuwon City	TEKNISI	KARYAWAN	Tidak	089635452567	\N	1964-11-29 00:00:00+07	\N
00661	MARIANA DINATHA	P	2013-07-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	085733340482	\N	1985-03-05 00:00:00+07	\N
01460	NATTAYA EMERALDA EKAWARDHANA	P	2021-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	0895627550618	nattaya_emeralda@gloriaschool.org	1998-08-14 00:00:00+07	9F  8B  13  E6
00572	JANE LIONDA	P	2012-09-10 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	08988992102	\N	1991-02-21 00:00:00+07	\N
00060	LINDAWATI SOMALIM	P	2010-07-12 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Tidak	\N	\N	1983-11-16 00:00:00+07	\N
00779	HEBERT ADRIANTO RUBAY	L	2014-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	085730474165	\N	1990-06-21 00:00:00+07	\N
00951	DEBRINA PUSPITA SOEDIBJO	P	2016-01-05 00:00:00+07	\N	Lajang	PART TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	087855908015	\N	1989-10-10 00:00:00+07	\N
00325	KITRI	P	2002-05-01 00:00:00+07	\N	Menikah	FULL TIME	UMUM	Kupang Indah	KANTIN	KARYAWAN	Tidak	\N	\N	1957-06-30 00:00:00+07:30	\N
00553	PATRICIA SANTI STEVANY WELLOWATI	P	2012-07-13 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	081332114445	\N	1989-05-02 00:00:00+07	\N
00264	YULIASTUTI DWI WULANDARI	P	2010-07-01 00:00:00+07	\N	Menikah	PART TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	\N	\N	1986-07-21 00:00:00+07	\N
00354	SIMON PETRUS BENU	L	1997-07-15 00:00:00+07	\N	Menikah	FULL TIME	SATPAM	Kupang Indah	SECURITY	KARYAWAN	Aktif	081357286399	felixbenu91@gmail.com	1974-02-28 00:00:00+07	\N
00391	LASARUS SETYO PAMUNGKAS	L	2009-07-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Pakuwon City	IT	KARYAWAN	Tidak	081332320711	lasarus_setyo@gloriaschool.org	1987-04-15 00:00:00+07	\N
00916	FENNY ALFIONNITA	P	2015-07-27 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	082298457086	\N	1992-08-26 00:00:00+07	\N
01136	ELLENA NOVIOLETA	P	2017-07-24 00:00:00+07	\N	Lajang	PART TIME	SD1	Pacar	GURU	GURU	Aktif	082144039504	ellena_novioleta@gloriaschool.org	1995-11-02 00:00:00+07	\N
01349	CITRA PRABHITA	P	2019-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	081217455620	mariacitra447@gmail.com	1995-04-21 00:00:00+07	\N
01044	INDAH SARASTUTI	P	2016-07-18 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	085641621407	indah_sarastuti@gloriaschool.org	1987-04-18 00:00:00+07	9F  E1  0F  E6
00889	JONG DAVID SETIO	L	2015-07-01 00:00:00+07	\N	Menikah	PART TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	085292919298	davidsetio77@gmail.com	1977-10-29 00:00:00+07	\N
01539	THERESIA AYU KUSDWIHARINI	P	2022-09-12 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	081937065612	theresia_kusdwiharini@gloriaschool.org	1984-07-07 00:00:00+07	\N
01571	SAVIERA CHRISTINA DEVIKA	P	2023-06-05 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	TATA USAHA	KARYAWAN	Aktif	083852027437	saviera_devika@gloriaschool.org	2000-09-15 00:00:00+07	9F  39  0D  E6
00287	INGGRAINI HARTONO	P	2004-01-02 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	082302222481	inggraini_hartono@gloriaschool.org	1977-10-11 00:00:00+07	7F  A5  13  E6
00501	WANDA KRISMA NATHANIA	P	2011-12-15 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	081331937784	\N	1989-03-04 13:36:21+07	\N
00220	WIWIK WIRASATI, S. PD.	P	1996-07-24 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	TATA USAHA	KARYAWAN	Tidak	081216016031	wiwik_wirasati@gloriaschool.org	1969-06-03 00:00:00+07	\N
01310	MARIA SIFERA MUMBA	P	2019-03-06 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	081991111986	maria_sifera@gloriaschool.org	1989-12-16 00:00:00+07	DF  C1  14  E6
00093	EVA SALOME DYAH UTAMI	P	2010-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	\N	\N	1977-10-06 00:00:00+07	\N
00611	YASINTA ASTRID YUNIARTI	P	2013-01-14 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	0811340927	astrid_yuniarti@gloriaschool.org	1978-06-27 00:00:00+07	3F  E7  10  E6
01311	DINDA PUTRI AMELIA	P	2019-03-11 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	0895326880946	dinda_amelia@gloriaschool.org	1996-05-02 00:00:00+07	\N
00548	SIBYL ROZELLA SOETEDJA	P	2012-07-01 00:00:00+07	\N	Lajang	PART TIME	SD3	Pakuwon City	GURU	GURU	Tidak	083830233380	\N	1990-04-10 00:00:00+07	\N
01620	AURELIUS VINCENT	L	2024-01-03 00:00:00+07	\N	Lajang	HONORER	SMA2	Pakuwon City	GURU	GURU	Tidak	087851304500	aurelius_vincent@gloriaschool.org	2000-07-21 00:00:00+07	\N
01482	MERRY SETYARINI	P	2021-08-01 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	BIMBINGAN/KONSELING	GURU	Tidak	081914556089	merry_setyarini@gloriaschool.org	1989-12-29 00:00:00+07	\N
00770	NEHEMIA DUTA PRASETYO	L	2014-07-01 00:00:00+07	\N	Lajang	PART TIME	SD3	Pakuwon City	GURU	GURU	Tidak	087852119712	\N	1989-10-02 00:00:00+07	\N
01106	LYDIA MYRTHA TANDONO	P	2017-04-25 00:00:00+07	\N	Menikah	PART TIME	SD2	Kupang Indah	GURU	GURU	Tidak	081235142702	\N	1990-04-01 00:00:00+07	\N
01570	YOHANA THERESIA	P	2023-04-17 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	\N	yohana_theresia@gloriaschool.org	2001-06-09 00:00:00+07	\N
80031	FRANSISCA XAVERIA TIARA ANDHAPTIKA	P	2025-07-01 00:00:00+07	\N	Lajang	-	SD3	Pakuwon City	NON PEGAWAI	NON PEGAWAI	Aktif	081392293457	\N	2000-12-16 00:00:00+07	\N
00428	POLII SIFRA YOHANNA	P	2011-01-10 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Tidak	085732536146	\N	1984-01-14 00:00:00+07	\N
01735	ALVIN GABRIEL JOADIANTO	L	2025-08-04 00:00:00+07	\N	Lajang	PART TIME	SD1	Pacar	GURU	GURU	Aktif	081335512377	alvin_joadianto@gloriaschool.org	2000-12-15 00:00:00+07	\N
00529	NONCE TRISNAWATY	P	2012-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	081230927272	nonce_trisnawati@gloriaschool.org	1987-11-13 00:00:00+07	9F  B3  12  E6
00509	MAGDALENA KURNIAWAN	P	2012-02-06 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	081357782200	\N	1987-03-20 00:00:00+07	\N
01588	ANGGI AGAVANI SHANTIKA PANJAITAN	P	2023-07-01 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	GA	KARYAWAN	Aktif	082257336079	anggi_panjaitan@gloriaschool.org	1995-10-29 00:00:00+07	9F  6E  0B  E6
01090	PRISCA OCTAVIA	P	2017-02-15 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	BIMBINGAN/KONSELING	GURU	Tidak	085725281027	\N	1990-10-29 00:00:00+07	\N
01517	RENDYTA WIDYA PRASSANTI	P	2022-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	081325018156	rendyta_prassanti@gloriaschool.org	1997-02-06 00:00:00+07	\N
00543	BERNADET	L	2012-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	081931541511	\N	1985-04-17 00:00:00+07	\N
00009	DIAN SUSIATI	P	1995-11-27 00:00:00+07	\N	Menikah	FULL TIME	SD1	Pacar	GURU	GURU	Aktif	\N	dian_susiati@gloriaschool.org	1971-03-23 00:00:00+07	7F  83  12  E6
00258	TAN YUNG HAN	L	2010-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	081703775575	yung_han@gloriaschool.org	1985-03-08 00:00:00+07	\N
00774	HENDRA SAPUTRA	L	2014-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	083830244695	\N	1981-12-21 00:00:00+07	\N
00638	SUPARTI	P	2013-04-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	SUSTER	KARYAWAN	Aktif	081938145082	Suparti050983@gmail.com	1983-09-05 00:00:00+07	D6  67  DD  19
00085	DONALD HERMANUS KODONGAN	L	2008-08-01 00:00:00+07	\N	Menikah	HONORER	SD2	Kupang Indah	GURU	GURU	Tidak	08165402760	donald3kodongan@gmail.com	1963-11-06 00:00:00+07:30	\N
00686	ELMIWATI DEWI SUSANTI	P	2013-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	081335365380	elmiwati_dewi@gloriaschool.org	1987-09-05 00:00:00+07	\N
01099	ANDRIAS	L	2017-04-03 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	PERPUSTAKAAN	KARYAWAN	Tidak	082244588677	andrias_andrias@gloriaschool.org	1986-04-06 00:00:00+07	\N
00933	DISMAS WIBISONO	L	2015-08-14 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	081330706677	dismas_wibisono@gloriaschool.org	1990-01-14 00:00:00+07	\N
01024	CHRISTIN JUWITA	P	2016-07-01 00:00:00+07	\N	Menikah	PART TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	082225121295	\N	1984-03-15 00:00:00+07	\N
01381	BRIGITA WAHYUNINGTYAS YANIKA P	P	2019-10-01 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	082225476134	brigita_sastro@gloriaschool.org	1996-06-13 00:00:00+07	\N
00134	ELISABETH SETIAWATI S	P	2010-07-01 00:00:00+07	\N	Lajang	HONORER	PGTK3	Pakuwon City	GURU	GURU	Tidak	\N	\N	1989-04-20 00:00:00+07	\N
00688	LINDAWATI SOMALIM	P	2013-07-17 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	081331171802	\N	1983-11-16 00:00:00+07	\N
01105	DEVIYANDA KUSUMA NASARANI	P	2017-04-20 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	081237374761	\N	1992-01-17 00:00:00+07	\N
01696	VICTOR BINTANG GEMILANG	L	2025-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	081615448225	victor_gemilang@gloriaschool.org	2001-08-17 00:00:00+07	3F  73  15  E6
00562	MICHAEL CARLOS KODOATI	L	2012-08-01 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	'089620024155	\N	1986-05-11 00:00:00+07	\N
01533	ADITYA ANGGORO WIDHI NUGROHO	L	2022-08-09 00:00:00+07	\N	Lajang	HONORER	SMP1	Kupang Indah	GURU	GURU	Tidak	81233920428	adityaucielwork@gmail.com	1992-08-11 00:00:00+07	\N
00769	KARISSA MITHA HARIJANTO	P	2014-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	081234526906	\N	1991-03-25 00:00:00+07	\N
00791	CHAN CHRISTIN CHANDOKO	P	2014-08-01 00:00:00+07	\N	Menikah	HONORER	SD2	Kupang Indah	GURU	GURU	Tidak	\N	\N	1982-02-04 00:00:00+07	\N
00820	OLIVIA MELIANA	P	2014-08-15 00:00:00+07	\N	Lajang	HONORER	SD3	Pakuwon City	GURU	GURU	Tidak	087854156679	\N	1992-07-22 00:00:00+07	\N
01007	MELISA KRISTINA	P	2016-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	081938039025	melisa_kristina@gloriaschool.org	1993-04-21 00:00:00+07	BF  14  17  E6
00776	CHRISTINE SOEGIARTO	P	2014-07-01 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Pacar	UNIT USAHA	KARYAWAN	Aktif	085230715511	christine_soegiarto@gloriaschool.org	1991-10-07 00:00:00+07	DF  CF  17  E6
00406	YANA POEDJIANTO	L	2008-04-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	KOORDINATOR	KARYAWAN	Aktif	085101602300	yana_p@gloriaschool.org	1970-03-01 00:00:00+07	DF  3F  15  E6
00410	E.Y. FIBRI ANDRIANTO	L	2010-09-01 00:00:00+07	\N	Menikah	PART TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	\N	\N	1900-02-09 00:00:00+07:07:12	\N
01223	SONIA RETSY	P	2018-07-05 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	087833231999	sonia_retsy@gloriaschool.org	1995-03-26 00:00:00+07	\N
01640	YOEL KURNIAWAN SUTANTO	L	2024-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	0895633125063	yoel_sutanto@gloriaschool.org	1999-10-28 00:00:00+07	9F  CB  10  E6
00499	KRISTIN IDA	P	2011-12-06 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	0817316268	\N	1977-11-05 00:00:00+07	\N
01607	ABRAHAM EKA WINATA	L	2023-09-01 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PEMBELIAN	KARYAWAN	Aktif	082233112133	abraham_winata@gloriaschool.org	1993-07-04 00:00:00+07	5F  1F  16  E6
01382	MEGAWATI LIMANTARA	P	2019-10-21 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	082230136777	megawati_limantara@gloriaschool.org	1996-08-10 00:00:00+07	\N
01124	YAP TJAN HAN	P	2017-07-03 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	KURIKULUM SMP-SMA	KARYAWAN	Tidak	0811379788	clara_yap@gloriaschool.org	1966-02-08 00:00:00+07	\N
01254	YOEL ANDY PRASETIA	L	2018-11-21 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	082234000616	\N	1993-05-14 00:00:00+07	\N
00196	IRA MARDYANTI	P	1997-09-01 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	BIMBINGAN/KONSELING	GURU	Aktif	08123014501	ira_mardyanti@gloriaschool.org	1971-01-10 00:00:00+07	3F  70  13  E6
00841	ADHY ARINI	P	2015-07-01 00:00:00+07	\N	Menikah	PART TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	08155088805	\N	1975-04-14 00:00:00+07	\N
90017	CHRISTINE TAHULENDING	P	2022-07-01 00:00:00+07	\N	Lajang	-	YAYASAN	Pakuwon City	SUSTER	OUTSOURCING	Aktif	\N	\N	1945-08-17 00:00:00+09	F6  FF  01  1A
01504	SHANTI HERMAWAN	P	2022-02-02 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	085232073050	shanti_hermawan@gloriaschool.org	1983-09-13 00:00:00+07	5F  E8  16  E6
01579	ANGELIQUE FELICIA JOSEPHINE	P	2023-05-08 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	BIMBINGAN/KONSELING	GURU	Tidak	081938446201	angelique_josephine@gloriaschool.org	2001-09-04 00:00:00+07	\N
01319	EIRENE SANTOSO	P	2019-06-26 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	TATA USAHA	KARYAWAN	Tidak	081805094516	eirene_santoso@gloriaschool.org	1987-10-23 00:00:00+07	\N
00544	MONICA PAATH	P	2012-07-01 00:00:00+07	\N	Menikah	PART TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	081703408787	\N	1985-10-18 00:00:00+07	\N
00257	ANDRE JAYADI	L	2008-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	\N	\N	1983-06-14 00:00:00+07	\N
00706	VINCENTIUS AFRI EKO SAPUTRA	L	2013-09-02 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	WAKIL KEPALA SEKOLAH	GURU	Aktif	08562875512	vincentius_afri@gloriaschool.org	1991-01-22 00:00:00+07	1F  09  18  E6
00693	ELISABETH NOVIA TAYL	P	2013-08-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	081904833722	\N	1991-11-21 00:00:00+07	\N
00364	MATIUS NISWANTO	L	2008-09-01 00:00:00+07	\N	Cerai	-	UMUM	Kupang Indah	SOPIR	GURU	Tidak	\N	\N	1977-11-06 00:00:00+07	\N
01590	RAHEL IKA PRIMADINI MARYANTO	P	2023-07-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Tidak	085775546332	rahel_maryanto@gloriaschool.org	1996-06-04 00:00:00+07	\N
01151	AGNES AGUSTINE	P	2017-08-28 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	TATA USAHA	KARYAWAN	Tidak	087852415566	\N	1995-08-25 00:00:00+07	\N
01632	HAPPY KHARISMA SUDJARWO	P	2024-03-04 00:00:00+07	\N	Lajang	FULL TIME	SD4	Grand Pakuwon	TATA USAHA	KARYAWAN	Aktif	085155494033	happy_sudjarwo@gloriaschool.org	1999-06-13 00:00:00+07	3F  BD  0E  E6
00268	ARYANI DEWI	P	2000-07-01 00:00:00+07	\N	Cerai	FULL TIME	SMA1	Sukomanunggal	KEPALA SEKOLAH	GURU	Tidak	0818323771	\N	1967-06-29 00:00:00+07	\N
00547	ELLYSSA	P	2012-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	08993850861	\N	1982-06-01 00:00:00+07	\N
00365	YOSEP HANDRIYANTO	L	2010-03-22 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Pakuwon City	UMUM	KARYAWAN	Aktif	081331333089	yos3phan.gilbert@gmail.com	1983-03-14 00:00:00+07	\N
01133	ANDREAS ADIPRASETYO	L	2017-07-10 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Tidak	082232863650	andreas_adiprasetyo@gloriaschool.org	1995-06-03 00:00:00+07	\N
01695	EUNIKE GIOVANNI SANTOSO	P	2025-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	085161552517	eunike_santoso@gloriaschool.org	1999-01-25 00:00:00+07	FF  EE  15  E6
00313	SIAMIN	L	1997-08-01 00:00:00+07	\N	Menikah	FULL TIME	UMUM	Kupang Indah	KEBERSIHAN	KARYAWAN	Tidak	\N	\N	1959-01-12 00:00:00+07:30	\N
00876	YENI TRIVENA	P	2015-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	085732575333	yeni_trivena@gloriaschool.org	1992-03-10 00:00:00+07	9F  67  16  E6
00801	DEPIRIANUS GULO	L	2014-09-02 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	WAKIL KEPALA SEKOLAH	GURU	Aktif	081234033698	depirianus_gulo@gloriaschool.org	1990-05-28 00:00:00+07	5F  B1  0D  E6
00310	JHON LEGA	L	1997-07-15 00:00:00+07	\N	Menikah	FULL TIME	UMUM	Kupang Indah	KEBERSIHAN	KARYAWAN	Aktif	081217268779	Jhonlega8@gmail.com	1974-07-01 00:00:00+07	\N
00766	VERONICA MELIANA	P	2014-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	082233222460	veronica_meliana@gloriaschool.org	1980-04-19 00:00:00+07	7F  AA  14  E6
00103	LUHI APRILITA	P	2002-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	PERPUSTAKAAN	KARYAWAN	Tidak	\N	\N	1980-04-30 00:00:00+07	\N
00782	RINA MARWOTO	P	2014-07-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	085731353593	\N	1983-05-11 00:00:00+07	\N
01414	GISELA ELSHADELIN	P	2020-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	087886102343	gisela_elshadelin@gloriaschool.org	1995-05-31 00:00:00+07	\N
01585	REGINA EVIANTY TEDJA	P	2023-07-01 00:00:00+07	\N	Menikah	PART TIME	SD4	Grand Pakuwon	GURU	GURU	Aktif	081250367129	regina_tedja@gloriaschool.org	1996-11-09 00:00:00+07	\N
01420	OKTAVIANA PASASSUNG	P	2020-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	081210697668	oktafiana_pasassung@gloriaschool.org	1995-10-23 00:00:00+07	\N
00824	DAMIANUS WISUKAJAYADI	L	2014-09-02 00:00:00+07	\N	Menikah	HONORER	SMA2	Pakuwon City	GURU	GURU	Tidak	081330496066	\N	1976-08-13 00:00:00+07	\N
00077	CHRISTINE PERMANASARI	P	2009-11-16 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	\N	\N	1986-02-22 00:00:00+07	\N
01659	GUERRA JR VICTORINO	L	2024-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD4	Grand Pakuwon	GURU	GURU	Tidak	089698093401	guerra_victorino@gloriaschool.org	1973-07-09 00:00:00+07	\N
01537	ALBERT BUDIYANTO EKO PUTRO	L	2022-09-02 00:00:00+07	\N	Menikah	HONORER	SMP2	Pakuwon City	GURU	GURU	Tidak	\N	albertbudiyanto@gmail.com	1983-07-31 00:00:00+07	\N
01672	ELIANA LIEMAN	P	2024-08-05 00:00:00+07	\N	Menikah	PART TIME	SD2	Kupang Indah	GURU	GURU	Aktif	082119134295	eliana_lieman@gloriaschool.org	1979-09-15 00:00:00+07	\N
00908	BUDIMAN DJOJOPUTRO (YOK LAY)	L	2015-07-07 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	UNIT USAHA	KARYAWAN	Aktif	08123003829	budiman_djojoputro@gloriaschool.org	1975-12-10 00:00:00+07	FF  80  0B  E6
00299	RUBEN ARY PALAPESSY	L	2002-11-01 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	TATA USAHA	KARYAWAN	Tidak	\N	\N	1976-12-11 00:00:00+07	\N
01356	AGATHA FELICIA	P	2019-07-18 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	089624623005	\N	1997-10-12 00:00:00+07	\N
00775	NATALIA WIJAYA PURWO	P	2014-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	082142222203	natalia_wijaya@gloriaschool.org	1991-02-23 00:00:00+07	\N
00902	SARAH MARINA NAPITUPULU	P	2015-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	082167494170	sarah_marina@gloriaschool.org	1991-04-19 00:00:00+07	\N
00288	JEFFRY YOHANES KARTOLO	L	2009-08-01 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	\N	\N	1987-06-27 00:00:00+07	\N
00656	SANDRA SARI ELISABETH	P	2013-07-01 00:00:00+07	\N	Lajang	PART TIME	SD1	Pacar	BIMBINGAN/KONSELING	GURU	Tidak	085854224522	\N	1987-04-06 00:00:00+07	\N
00861	WILYANA	P	2015-07-01 00:00:00+07	\N	Menikah	PART TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	08165419406	\N	1981-03-21 00:00:00+07	\N
01413	IRENE NOVELLA SIDABUTAR	P	2020-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	087851265825	irene_sidabutar@gloriaschool.org	1994-11-18 00:00:00+07	\N
01095	SYLVANIA ALINDRA PUTRI	P	2017-03-15 00:00:00+07	\N	Lajang	PART TIME	SD3	Pakuwon City	GURU	GURU	Tidak	087853007066	\N	1994-06-06 00:00:00+07	\N
01453	DEVVI WAHYU WULAN DINI	P	2021-03-01 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	089637107568	devvi_dini@gloriaschool.org	1999-09-13 00:00:00+07	5F  B3  12  E6
01568	SHEREN AUGUSTA	P	2023-02-15 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	82331424960	sheren_augusta@gloriaschool.org	1992-08-29 00:00:00+07	BF  FE  16  E6
00684	JOHANES GUALBERTUS HENDRA	L	2013-07-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	PEMBELIAN	KARYAWAN	Tidak	081515002674	yohanes_hendra@gloriaschool.org	1974-07-18 00:00:00+07	\N
01239	SELLY MONICA AULIA	P	2018-08-15 00:00:00+07	\N	Lajang	HONORER	SD2	Kupang Indah	TATA USAHA	KARYAWAN	Tidak	081333434411	\N	1994-07-11 00:00:00+07	\N
01415	YANUAR CHRISTIE AJIE PRAMONO	L	2020-07-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	IT	KARYAWAN	Aktif	085105197998	ajie_pramono@gloriaschool.org	1980-01-26 00:00:00+07	5F  59  15  E6
01675	HERRA DIANDRA	P	2024-08-19 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	TATA USAHA	KARYAWAN	Aktif	0895627131212	herra_diandra@gloriaschool.org	2000-09-27 00:00:00+07	5F  A6  0B  E6
00778	WILLY ALFIANTO YUWONO	L	2014-07-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	WAKIL KEPALA SEKOLAH	GURU	Aktif	087855080907	willy_alfianto@gloriaschool.org	1989-06-27 00:00:00+07	5F  B0  10  E6
01589	ANDRIA NATAKUSUMA	L	2023-07-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	KEUANGAN	KARYAWAN	Aktif	087832880330	andria_natakusuma@gloriaschool.org	1984-06-02 00:00:00+07	1F  FC  0D  E6
01422	VIDIA ARUM MANJANI	P	2020-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	081330184136	vidia_manjani@gloriaschool.org	1991-04-02 00:00:00+07	\N
00398	SRI SETYAWATI	P	2003-07-31 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Pakuwon City	UNIT USAHA	KARYAWAN	Aktif	083831567615	sri_setyawati@gloriaschool.org	1983-09-09 00:00:00+07	3F  94  14  E6
01463	KEZIA THEODORA SATYAPUTRA	P	2021-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Aktif	081234256595	kezia_theodora@gloriaschool.org	1996-05-18 00:00:00+07	7F  67  10  E6
00466	JOHAN ARDIANSAH	L	2011-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	08563011694	\N	1986-12-17 09:47:54+07	\N
01452	L.R. IMMANUEL KOTAMBONAN	L	2021-03-01 00:00:00+07	\N	Menikah	HONORER	SD2	Kupang Indah	GURU	GURU	Tidak	08973999339	ralemsy.29@gmail.com	1985-05-29 00:00:00+07	\N
01241	YERIKHA KRISTINA DEWI	P	2018-09-03 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Tidak	085731587700	yerikha_dewi@gloriaschool.org	1989-05-18 00:00:00+07	3F  0C  0F  E6
00164	SIENNY LIANTY SUWITO	P	2009-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	\N	\N	1985-03-15 00:00:00+07	\N
00269	BEN SANTOSO BUDIMAN	L	2010-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	\N	ben_santoso@gloriaschool.org	1965-11-26 00:00:00+07	1F  11  14  E6
01323	ARMAND SAMMUEL JOSTANTO	L	2019-06-17 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	KURIKULUM SMP-SMA	KARYAWAN	Tidak	08123564557	armand_jostanto@gloriaschool.org	1980-09-03 00:00:00+07	\N
00254	YOHANA RATNAWATI	P	2008-04-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	\N	\N	1983-10-29 00:00:00+07	\N
01567	TIRTA ANGELA	P	2023-02-13 00:00:00+07	\N	Cerai	FULL TIME	SMA2	Pakuwon City	PERPUSTAKAAN	KARYAWAN	Aktif	81233669654	tirta_angela@gloriaschool.org	1993-09-02 00:00:00+07	7F  E1  0F  E6
01153	ADYANINGRUM PUSPITASARI C.P.	P	2017-09-11 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	085643185666	adyaningrum_puspitasari@gloriaschool.org	1991-04-09 00:00:00+07	9F  2A  17  E6
01370	ANASTASIA VANNESA OVELIA	P	2019-08-02 00:00:00+07	\N	Lajang	HONORER	SD3	Pakuwon City	GURU	GURU	Tidak	085791669878	anastasiavannesaovelia17@gmail.com	1999-06-06 00:00:00+07	\N
00436	CAROLINA ANDAHARA	P	2011-05-02 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	KEPALA SEKOLAH	GURU	Aktif	081330233265	carolina_anda@gloriaschool.org	1982-01-29 00:00:00+07	DF  FA  11  E6
00469	NENCI WUNDU	P	2011-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	085213138779	nenci_wundu@gloriaschool.org	1978-05-12 00:00:00+07	5F  70  13  E6
00074	ASTUTIK ANI ERNAWATI, SPD, S.PD	P	1998-08-01 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	\N	astutik_ernawati@gloriaschool.org	1971-08-17 00:00:00+07	9F  4E  10  E6
01116	MELISA SAMIJEN	P	2017-07-03 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	089606777370	\N	1989-05-02 00:00:00+07	\N
01019	HENNY ROSSALINA INDAH PUSPITA	P	2016-07-01 00:00:00+07	\N	Lajang	PART TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	089676003373	\N	1988-06-15 00:00:00+07	\N
01047	AGUS SURYADI	L	2016-08-01 00:00:00+07	\N	Lajang	HONORER	SD3	Pakuwon City	GURU	GURU	Tidak	082143185868	\N	1986-08-09 00:00:00+07	\N
00907	DEWINDA ALFINOANTI PELLO	P	2015-07-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	085330178571	\N	1987-11-07 00:00:00+07	\N
01443	KURNIA SETIAWAN	L	2020-08-12 00:00:00+07	\N	Menikah	HONORER	SD3	Pakuwon City	GURU	GURU	Tidak	089648134527	kurniasetiawan17@gmail.com	1983-02-17 00:00:00+07	\N
00338	SUWARTI	P	2004-07-15 00:00:00+07	\N	Menikah	FULL TIME	UMUM	Kupang Indah	KANTIN	KARYAWAN	Tidak	\N	\N	1962-04-08 00:00:00+07:30	\N
00746	RIA MARCELINA SUGIARTO	P	2014-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	08179333373	\N	1990-03-20 00:00:00+07	\N
00452	DINDA AYU KURNIASARI	P	2011-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	081554080393	dinda_ayu@gloriaschool.org	1989-04-20 09:18:58+07	BF  EE  15  E6
00610	LIONA MARGARETH	P	2012-11-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	KOORDINATOR	KARYAWAN	Aktif	081938686705	liona_margareth@gloriaschool.org	1975-11-11 00:00:00+07	DF  10  14  E6
00555	DWIANA WULAN DARI	P	2012-08-01 00:00:00+07	\N	Menikah	HONORER	PGTK2	Kupang Indah	GURU	GURU	Tidak	08563012158	dwianawulandari88@gmail.com	1988-05-02 00:00:00+07	\N
00958	AGATHA NATALIA SUGIARTO	P	2016-01-04 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	081222099578	\N	1992-12-16 00:00:00+07	\N
00987	IVAN BERTON HERMAWAN	L	2016-04-06 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Tidak	081233030004	\N	1991-03-21 00:00:00+07	\N
00318	SUKARYONO	L	1995-08-10 00:00:00+07	\N	Menikah	FULL TIME	UMUM	Kupang Indah	KEBERSIHAN	KARYAWAN	Tidak	\N	sukaryono225@gmail.com	1971-06-22 00:00:00+07	\N
00471	YULIANA ARIANDINI AYUNINGTYAS	P	2011-07-01 00:00:00+07	\N	Lajang	-	SMP2	Pakuwon City	PERPUSTAKAAN	KARYAWAN	Tidak	085648078817	\N	1989-07-28 00:00:00+07	\N
01174	LOUIS MARTIN	L	2018-01-05 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	INTERNAL AUDIT	KARYAWAN	Tidak	08113008873	\N	1990-12-30 00:00:00+07	\N
01566	DEBORA ERNAULI BORUSIAHAAN	P	2023-02-06 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	082140774019	debora_borusiahaan@gloriaschool.org	1998-06-04 00:00:00+07	\N
00328	MIYATUN	P	2001-07-01 00:00:00+07	\N	Menikah	FULL TIME	UMUM	Kupang Indah	KANTIN	KARYAWAN	Aktif	\N	miyatungloria@gmail.com	1977-07-14 00:00:00+07	\N
01030	CATUR ADI WIDIANTORO	L	2016-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	BIMBINGAN/KONSELING	GURU	Tidak	085640473303	\N	1992-11-14 00:00:00+07	\N
00556	FEBRYNA HARGYANTI	P	2012-07-19 00:00:00+07	\N	Lajang	PART TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	081805514945	\N	1986-02-15 00:00:00+07	\N
00829	ANDRIA NATAKUSUMA	L	2014-10-01 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	087832880330	\N	1984-06-02 00:00:00+07	\N
00026	LILYANA CENDRAWATI	P	2002-07-01 00:00:00+07	\N	Menikah	PART TIME	SD1	Pacar	GURU	GURU	Tidak	\N	\N	1949-08-17 00:00:00+08	\N
01242	JESSICA NOVIA NILOWARSO	P	2018-09-07 00:00:00+07	\N	Lajang	FULL TIME	SD1	Pacar	GURU	GURU	Tidak	08113540950	\N	1996-01-28 00:00:00+07	\N
01595	SARA OKTAVIA CHRISTY	P	2023-07-12 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Aktif	085851770791	sara_christy@gloriaschool.org	1999-10-09 00:00:00+07	7F  1E  13  E6
90029	HESTY HERMAWATY	P	2025-07-01 00:00:00+07	\N	Lajang	-	YAYASAN	Pakuwon City	SUSTER	OUTSOURCING	Aktif	\N	\N	1945-08-17 00:00:00+09	6A  A1  46  BA
00108	MUSTIKA HANDAYANI	P	2005-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	082124992224	mustika_handayani@gloriaschool.org	1969-04-14 00:00:00+07	9F  19  18  E6
00937	MERLIN SANTOSO	P	2015-08-20 00:00:00+07	\N	Lajang	HONORER	SD3	Pakuwon City	GURU	GURU	Tidak	08123007709	mrl_san@yahoo.com	1985-09-05 00:00:00+07	\N
00718	SARAH LIMUIL	P	2013-09-23 00:00:00+07	\N	Menikah	PART TIME	SMA2	#N/A	GURU	GURU	Tidak	08165403777	\N	1943-08-18 00:00:00+09	\N
01159	IETA METHARIANI	P	2017-10-02 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	089676553099	ieta_methariani@gloriaschool.org	1995-07-07 00:00:00+07	9F  E7  10  E6
01572	DOROTEA NINDYA SEVRINA HAPSARI	P	2023-05-15 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	LABORAN	KARYAWAN	Tidak	085236808808	dorotea_hapsari@gloriaschool.org	1999-09-18 00:00:00+07	\N
01596	VIONITA HERYUGIPRATIWI SE.,M.PSDM	P	2023-07-21 00:00:00+07	\N	Menikah	FULL TIME	SD4	Grand Pakuwon	TATA USAHA	KARYAWAN	Aktif	081233538694	vionita_heryugipratiwi@gloriaschool.org	1985-01-04 00:00:00+07	1F  51  0D  E6
00733	YOGI TJIPTOSARI	P	2014-01-03 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	KURIKULUM SMP-SMA	KARYAWAN	Tidak	081802027085	\N	1972-03-01 00:00:00+07	\N
01338	RENTA	P	2019-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	081217772631	renta_hutagaol@gloriaschool.org	1989-09-03 00:00:00+07	\N
00128	CAROLIN DIANA SARI	P	2009-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	08123214638	carolin_sari@gloriaschool.org	1984-08-21 00:00:00+07	7F  B3  12  E6
00167	SRI SULISTYANI	P	1993-07-21 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	\N	sri_sulistyani@gloriaschool.org	1966-02-12 00:00:00+07	DF  69  17  E6
90007	SRI PURWANTO	L	2022-07-01 00:00:00+07	\N	Menikah	-	YAYASAN	Kupang Indah	UMUM	OUTSOURCING	Tidak	\N	\N	2000-01-01 00:00:00+07	\N
00382	DWI INDRIA KRESNA	P	2010-04-05 00:00:00+07	\N	Lajang	-	YAYASAN	Kupang Indah	IT	KARYAWAN	Tidak	\N	\N	1985-02-24 00:00:00+07	\N
01409	MELKI VANRIEL	L	2020-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	085655069290	melki_vanriel@gloriaschool.org	1996-11-15 00:00:00+07	\N
01109	ALI SANTOSO	L	2017-05-02 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	PPM	KARYAWAN	Tidak	081703740783	\N	1988-10-12 00:00:00+07	\N
01064	MARIANA DINATHA	P	2016-08-25 00:00:00+07	\N	Menikah	HONORER	SD3	Pakuwon City	GURU	GURU	Tidak	085733340482	fei.jing2.fj@gmail.com	1985-03-05 00:00:00+07	\N
00870	NANCY HUNG ANDOKHO	P	2015-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	087855779092	\N	1992-11-10 00:00:00+07	\N
01679	EUNIKE PUTRI ANNEL	P	2024-10-28 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	PERPUSTAKAAN	KARYAWAN	Aktif	085161364314	eunike_annel@gloriaschool.org	2001-09-30 00:00:00+07	9C  97  A2  D3
00057	KUMALA SARI	P	2010-07-12 00:00:00+07	\N	Menikah	HONORER	PGTK2	Kupang Indah	GURU	GURU	Tidak	\N	\N	1973-05-20 00:00:00+07	\N
00657	LISA TANIA TEJO	P	2013-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	083856485437	\N	1989-05-05 00:00:00+07	\N
00414	SHIRLEY ROSA SETIANSYAH	P	2010-11-01 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	\N	\N	1988-06-03 00:00:00+07	\N
01669	RACHELSA SULISTYO TANTI	P	2024-07-22 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Tidak	081232925354	rachelsa_sulistyo@gloriaschool.org	1998-05-01 00:00:00+07	\N
00815	JEFFERSON SURYAWAN LIJADI	L	2014-08-25 00:00:00+07	\N	Lajang	PART TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	081703702815	\N	1988-12-15 00:00:00+07	\N
01428	FEBBY SANDRA DEVI	P	2020-07-02 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	0895349928739	febby_devi@gloriaschool.org	1993-02-20 00:00:00+07	\N
01041	CHAN CHRISTIN CHANDOKO, SE	P	2016-07-15 00:00:00+07	\N	Menikah	PART TIME	SD2	Kupang Indah	GURU	GURU	Tidak	081325044711	\N	1982-02-04 00:00:00+07	\N
00531	LILIK EVA ROSITA	P	2012-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	087852020900	lilik_eva@gloriaschool.org	1985-12-11 00:00:00+07	5F  55  17  E6
00069	SUMIATI	P	1997-06-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	SUSTER	KARYAWAN	Tidak	\N	\N	1958-03-03 00:00:00+07:30	\N
01555	DIAN GABRIELLA HARIANTO	P	2022-12-01 00:00:00+07	\N	Menikah	FULL TIME	SD1	Pacar	BIMBINGAN/KONSELING	GURU	Tidak	081278647939	dian_harianto@gloriaschool.org	1999-12-06 00:00:00+07	\N
00506	ANDRIAS	L	2012-01-05 00:00:00+07	\N	TBA	FULL TIME	SMP2	Pakuwon City	PERPUSTAKAAN	KARYAWAN	Tidak	\N	\N	1986-04-06 00:00:00+07	\N
00430	VERA	P	2011-02-16 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Tidak	081703007856	\N	1985-03-01 00:00:00+07	\N
00806	MAGDALENA DIAN PRATIWI	P	2014-08-11 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	085729094177	\N	1989-07-01 00:00:00+07	\N
01394	YORIKA HADIWIYOTO	P	2020-02-03 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	081252689189	yorika_hadiwiyoto@gloriaschool.org	1989-02-03 00:00:00+07	5F  7F  10  E6
01628	MICHAEL ARMSTRONG SUBALI	L	2024-01-22 00:00:00+07	\N	Lajang	FULL TIME	SD4	Grand Pakuwon	GURU	GURU	Tidak	085646656587	michaelarmstrong2001.mas@gmail.com	2001-09-29 00:00:00+07	\N
00727	YOEL WIBOWO	L	2013-11-11 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	087859615870	\N	1991-09-26 00:00:00+07	\N
90031	VALERIE NATHANIA P	P	2025-07-15 00:00:00+07	\N	Lajang	-	YAYASAN	Kupang Indah	PR DAN PSB	OUTSOURCING	Aktif	\N	\N	2000-01-01 00:00:00+07	76  50  6F  1A
01651	DERBY VALENSIA	P	2024-06-24 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Aktif	081217296101	derby_valensia@gloriaschool.org	2000-09-19 00:00:00+07	3F  93  0B  E6
00948	BETHARANI WIDIJAYANTI	P	2015-10-15 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	083848739584	\N	1992-10-13 00:00:00+07	\N
01246	WELYAM SAPUTRA LIM	L	2018-08-01 00:00:00+07	\N	Menikah	HONORER	SMA2	Pakuwon City	GURU	GURU	Tidak	083849333055	putra_guitarist@yahoo.com	1988-12-24 00:00:00+07	\N
01693	BRILIANTINO TEDJA KUSUMA	L	2025-07-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Aktif	081230335280	briliantino_kusuma@gloriaschool.org	2000-04-20 00:00:00+07	7F  A4  15  E6
01500	SHANNON ANGELA	P	2022-01-04 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	+6582873487	shannon_angela@gloriaschool.org	2001-08-14 00:00:00+07	\N
01440	SAMUEL POERNOMO PUTRA	L	2020-08-04 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	+6413173675	samuel_putra@gloriaschool.org	1991-04-05 00:00:00+07	\N
00498	MAYANG PUSPITA	P	2012-01-05 00:00:00+07	\N	TBA	PART TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	085733669943	\N	1988-06-13 00:00:00+07	\N
01456	REGINA SIBURIAN	P	2021-04-06 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	085132964812/ 08513296481	regina_siburian@gloriaschool.org	1994-11-19 00:00:00+07	\N
00014	TUTIK	P	1987-02-01 00:00:00+07	\N	Menikah	FULL TIME	SD1	Pacar	PERPUSTAKAAN	KARYAWAN	Tidak	\N	\N	1964-09-10 00:00:00+07	\N
00872	FERRY ANDHIKA PRIMADANA	L	2015-05-04 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	TATA USAHA	KARYAWAN	Aktif	08563421825	ferry_primadana@gloriaschool.org	1993-01-26 00:00:00+07	3F  61  14  E6
00713	DIANA MUTIARA RAHARDJO	P	2013-09-09 00:00:00+07	\N	Lajang	PART TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	\N	\N	1981-10-31 00:00:00+07	\N
00017	IMELDA LAYARTA	P	2002-07-01 00:00:00+07	\N	Menikah	HONORER	SD1	Pacar	GURU	GURU	Tidak	\N	\N	1953-11-10 00:00:00+07:30	\N
00482	DAVID PRASETYO SOENTORO	L	2011-07-29 00:00:00+07	\N	Lajang	HONORER	SMP1	Kupang Indah	GURU	GURU	Tidak	081553010958	\N	1991-02-26 11:00:08+07	\N
01552	MARSELINA GRACE KELLY	P	2022-11-15 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	08218936058	marselina_kelly@gloriaschool.org	1995-03-24 00:00:00+07	7F  BB  17  E6
00419	PRISKILA AFIKA WARMAN	P	2010-10-04 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	BIMBINGAN/KONSELING	GURU	Tidak	\N	\N	1985-02-05 00:00:00+07	\N
01532	MERLIN SANTOSO	P	2022-07-25 00:00:00+07	\N	Lajang	HONORER	SD3	Pakuwon City	GURU	GURU	Tidak	08123007709	mrl_san@yahoo.com	1985-09-05 00:00:00+07	\N
00897	MEGA DEWI SEKAR SARI	P	2015-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	BIMBINGAN/KONSELING	GURU	Tidak	08563304502	\N	1993-04-16 00:00:00+07	\N
90030	SCOTT MICHAEL FOX	L	2025-07-01 00:00:00+07	\N	TBA	-	SD4	Grand Pakuwon	GURU	OUTSOURCING	Aktif	\N	scott_fox@gloriaschool.org	1945-08-17 00:00:00+09	7F  E8  16  E6
00011	ELOK HIDAJATI	P	1999-03-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	085731599515	elok_hidayati@gloriaschool.org	1967-11-01 00:00:00+07	FF  39  11  E6
01186	LIDIA SARAH PANGGABEAN	P	2018-02-15 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	082367094870	lidia_sarah@gloriaschool.org	1995-02-16 00:00:00+07	BF  C6  0F  E6
00115	SYAMSIATUN PURWANTI	P	2006-01-01 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	081231616844	syamsiatun_purwanti@gloriaschool.org	1974-08-09 00:00:00+07	3F  69  0D  E6
00593	RICO ANDHIKA PERMANA	L	2012-10-16 00:00:00+07	\N	Lajang	HONORER	SMA1	#N/A	GURU	GURU	Tidak	08980383888	\N	1988-11-02 00:00:00+07	\N
01069	RUDY MULJO UTOMO	L	2016-09-01 00:00:00+07	\N	Menikah	HONORER	SMP1	Kupang Indah	GURU	GURU	Tidak	085102903313	\N	1971-10-01 00:00:00+07	\N
01306	LILIK KURNIAWAN	L	2019-02-15 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	088230464635	lilik_kurniawan@gloriaschool.org	1996-02-25 00:00:00+07	\N
00492	GO RU YIE	L	2011-09-14 00:00:00+07	\N	Menikah	HONORER	SMP1	Pakuwon City	GURU	GURU	Tidak	0811330323	\N	1970-05-26 00:00:00+07	\N
80001	SAHRONI PONCO WIBOWO	L	2025-06-15 00:00:00+07	\N	Menikah	-	SD1	Pacar	NON PEGAWAI	NON PEGAWAI	Aktif	081216445006	sahroni_ponco@gloriaschool.org	1976-07-02 00:00:00+07	\N
01519	DEA ABIGAIL SOETEDJO	P	2022-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	081998690614	dea_soetedjo@gloriaschool.org	1996-11-17 00:00:00+07	\N
00020	JUHANES	L	1999-07-01 00:00:00+07	\N	Lajang	PART TIME	SD1	Pacar	GURU	GURU	Tidak	\N	juhanes@gloriaschool.org	1970-03-16 00:00:00+07	\N
00235	ENDAH LILININGATI	P	2010-06-07 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	TATA USAHA	KARYAWAN	Tidak	\N	\N	1986-10-02 00:00:00+07	\N
01181	RISTO G FOEKH	L	2018-01-15 00:00:00+07	\N	Menikah	HONORER	SMA2	Pakuwon City	GURU	GURU	Tidak	081249225265	rgerolfoekh@gmail.com	1991-05-24 00:00:00+07	\N
01141	SETIAWAN DJUNAIDY	L	2017-07-31 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	081232356113	\N	1993-03-27 00:00:00+07	\N
00615	LAURENS YOSEF TOISUTA	L	2013-01-04 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	LOGISTIK	KARYAWAN	Tidak	085731058151	\N	1982-01-31 00:00:00+07	\N
00066	SETYANINGTYAS PANGASTUTI WIDODO	P	2007-05-15 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Aktif	087752603558	setyaningtyas_pangastuti@gloriaschool.org	1974-07-26 00:00:00+07	5F  21  0D  E6
00149	KERIELESON NICOLAS LAWAHERY	L	2009-08-21 00:00:00+07	\N	Lajang	HONORER	SMA2	Pakuwon City	GURU	GURU	Tidak	\N	\N	1981-11-09 00:00:00+07	\N
01525	PETRUS BANGKIT SURYATAMA	L	2022-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Aktif	087772445207	petrus_suryatama@gloriaschool.org	2000-05-20 00:00:00+07	DF  BA  16  E6
00578	AMELIA ONGKODJOJO	P	2012-09-17 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	BIMBINGAN/KONSELING	GURU	Tidak	081703227999	\N	1991-04-12 00:00:00+07	\N
00846	YOEL OKY SATRIAWAN	L	2015-03-02 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	BIMBINGAN/KONSELING	GURU	Tidak	085648540617	\N	1987-10-07 00:00:00+07	\N
01681	MATHILDA BONITA KIMBAL	P	2025-01-06 00:00:00+07	\N	Lajang	HONORER	SMA1	Sukomanunggal	GURU	GURU	Tidak	082240274018	mathilda_kimbal@gloriaschool.org	1990-04-25 00:00:00+07	\N
01643	STEVEN TAMARA	L	2024-05-02 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	PPM	KARYAWAN	Aktif	081938343535	steven_tamara@gloriaschool.org	1992-01-16 00:00:00+07	1F  A4  15  E6
01135	ROSALIA NIKEN WULAN NINGRUM	P	2017-07-15 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	08983563807	\N	1993-02-07 00:00:00+07	\N
00344	TRI BUDIANTO	L	2002-03-01 00:00:00+07	\N	Menikah	FULL TIME	SATPAM	Kupang Indah	SECURITY	KARYAWAN	Tidak	085785701340	dzikirsholawat10@gmail.com	1970-03-30 00:00:00+07	\N
00032	RUSIANA TINUS MANDARAU	P	1985-07-15 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	08175211281	rusiana_mandarau@gloriaschool.org	1960-11-16 00:00:00+07:30	\N
01684	ROY PERMADI	L	2025-01-06 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	GA	KARYAWAN	Aktif	81238704688	roy_permadi@gloriaschool.org	1986-10-18 00:00:00+07	BF  A5  13  E6
01548	EKO HERU PRASETYO	L	2022-10-17 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	85806893553	heru_prasetyo@gloriaschool.org	1986-06-18 00:00:00+07	\N
90014	DWI PRAS	L	2022-07-01 00:00:00+07	\N	Lajang	-	YAYASAN	Pakuwon City	UMUM	OUTSOURCING	Tidak	\N	\N	1945-08-17 00:00:00+09	\N
00672	GLORIA APRILITA KARIMBA	P	2013-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	BIMBINGAN/KONSELING	GURU	Tidak	08194277037	\N	1988-04-20 00:00:00+07	\N
00358	SUKIMIN	L	1996-09-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	SECURITY	KARYAWAN	Tidak	081332041978	\N	1968-12-11 00:00:00+07	\N
00924	ARINTA SHALOMITTA H	P	2015-08-31 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	08563054648	arinta_shalomitta@gloriaschool.org	1981-01-30 00:00:00+07	9F  0C  15  E6
00183	CHRISTANTI DIAH RETNANI	P	1997-07-14 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Aktif	081553378837	christanti_diah@gloriaschool.org	1972-04-24 00:00:00+07	5F  C1  14  E6
00518	VERONICA STEPHANIE LEWERISSA	P	2012-03-26 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	SUSTER	KARYAWAN	Tidak	085645067169	\N	1993-12-09 00:00:00+07	\N
01347	DINCE DINTI BILISTOLEN	P	2019-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	082232369167	dince_bilistolen@gloriaschool.org	1993-12-08 00:00:00+07	\N
00206	NGGODU LIWAR	L	1997-07-14 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Aktif	085257388247	nggodu_liwar@gloriaschool.org	1966-08-05 00:00:00+07	5F  71  11  E6
01497	TOMAS PERMANA	L	2021-10-01 00:00:00+07	\N	Menikah	PART TIME	SD1	Pacar	GURU	GURU	Tidak	082141620000	tomas_permana@gloriaschool.org	1991-08-10 00:00:00+07	\N
80013	YOHANES WELFRED PRAJOGO	L	2025-07-01 00:00:00+07	\N	Lajang	-	SMP1	Kupang Indah	NON PEGAWAI	NON PEGAWAI	Aktif	081249477207	yohaneswelfred@gmail.com	1981-07-25 00:00:00+07	\N
01389	YUKARISTIA	L	2020-01-03 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	089630280356/08978308959	yukaristia@gloriaschool.org	1997-03-24 00:00:00+07	3F  FC  0D  E6
00022	KARTIKA SARI,SE	P	2010-07-12 00:00:00+07	\N	Menikah	FULL TIME	PGTK1	Pacar	GURU	GURU	Tidak	\N	\N	1983-01-29 00:00:00+07	\N
01161	FABIOLA SUTIKNO	P	2017-10-09 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	GA	KARYAWAN	Tidak	0817391855	fabiola_sutikno@gloriaschool.org	1994-10-13 00:00:00+07	\N
01516	WILI KUMARA JUANG	L	2022-07-01 00:00:00+07	\N	Menikah	HONORER	SMP2	Pakuwon City	GURU	GURU	Tidak	085250302204	wilikumara@gmail.com	1992-06-12 00:00:00+07	\N
01436	JOSHUA LUKITO	L	2020-08-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	081334408473	joshua_lukito@gloriaschool.org	1995-05-13 00:00:00+07	\N
00764	ANNA MONALISA PELLO	P	2014-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	085691293077	anna_monalisa@gloriaschool.org	1986-06-03 00:00:00+07	3F  32  12  E6
01454	ANDRE MAKMUR	L	2021-02-25 00:00:00+07	\N	Menikah	HONORER	SMP2	Pakuwon City	GURU	GURU	Tidak	089675929291	andremakmur99@gmail.com	1992-11-21 00:00:00+07	\N
01218	MARIA FRANSISCA CANDRA YUNITA	P	2018-06-25 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	GA	KARYAWAN	Aktif	082143280660	mariayunita@gloriaschool.org	1995-06-11 00:00:00+07	5F  A6  16  E6
00605	STEFANIA NOVIANI	P	2013-01-07 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	\N	\N	1983-11-13 11:59:04+07	\N
00033	SABATINO,SE	L	2008-07-01 00:00:00+07	\N	Lajang	HONORER	SD1	Pacar	GURU	GURU	Tidak	\N	\N	1983-07-17 00:00:00+07	\N
01051	EVELYN MAGDALENA SUNJAYA	P	2016-08-01 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	081331245090	\N	1990-03-20 00:00:00+07	\N
01618	VALENTINO NATHANAEL PRABOWO	L	2023-11-15 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Aktif	089503357171	valentino_prabowo@gloriaschool.org	2000-06-11 00:00:00+07	9F  4F  16  E6
00260	THERESIA WENINGTYAS INTANI	P	2009-05-04 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	\N	\N	1984-03-16 00:00:00+07	\N
00551	ANGELA VALENCIA ISKANDAR	P	2012-07-03 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	081331312929	\N	1988-07-09 00:00:00+07	\N
00636	AGNES RAHARJO	P	2013-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	081703920590	\N	1991-08-09 00:00:00+07	\N
00973	DIONISIUS ANDREW WIBISONO	L	2016-04-15 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	082231363869	\N	1991-11-25 00:00:00+07	\N
01396	VANIA AMADEA SOEPRAJITNO	P	2020-03-16 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	082233131114	vania_soeprajitno@gloriaschool.org	1997-08-20 00:00:00+07	\N
01341	LENNY STIEFANNI	P	2019-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	BIMBINGAN/KONSELING	GURU	Aktif	085648629937	lenny_stiefanni@gloriaschool.org	1989-08-12 00:00:00+07	FF  3F  17  E6
00293	MOSES KURNIAWAN	L	1997-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	\N	moses_kurniawan@gloriaschool.org	1972-08-21 00:00:00+07	1F  9C  0C  E6
01530	JOSHUA LUKITO	L	2022-07-11 00:00:00+07	\N	Lajang	PART TIME	SMP1	Kupang Indah	GURU	GURU	Aktif	081334408473	joshua_lukito@gloriaschool.org	1995-05-13 00:00:00+07	23  67  90  4D
00616	ESTER SUSILOWATI	P	2013-01-04 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Pakuwon City	UNIT USAHA	KARYAWAN	Aktif	08563088627	ester_susilowati@gloriaschool.org	1987-02-26 00:00:00+07	1F  98  10  E6
00641	CLAUDYA TIO ELLEOSA	P	2013-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	087854204060	\N	1992-07-12 00:00:00+07	\N
00728	LAU JESSICA LEO	P	2013-11-12 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Tidak	08179318028	\N	1991-06-16 00:00:00+07	\N
00013	FOENG LIANA SELYN PRANATA	P	2008-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK1	Pacar	WAKIL KEPALA SEKOLAH	GURU	Aktif	085330538888	foengliana_pranata@gloriaschool.org	1969-06-17 00:00:00+07	7F  32  12  E6
80029	ONG WIE GANG	L	2025-07-01 00:00:00+07	\N	Menikah	-	SMP2	Pakuwon City	NON PEGAWAI	NON PEGAWAI	Aktif	081216976849	\N	1981-03-16 00:00:00+07	\N
80019	VALENTINO FERDINAND TAROREH	L	2025-07-01 00:00:00+07	\N	Lajang	-	SMP2	Pakuwon City	NON PEGAWAI	NON PEGAWAI	Aktif	081282648724	tino.futsal13@gmail.com	1988-02-18 00:00:00+07	\N
00144	INDYAH CHRISTMASTTUTI,S.S	P	2010-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	081330496066	indyah_christmasttuti@gloriaschool.org	1977-12-24 00:00:00+07	3F  7F  10  E6
01403	JOKO PRASTYO KOESNANTO	L	2020-08-01 00:00:00+07	\N	Lajang	HONORER	PGTK3	Pakuwon City	GURU	GURU	Tidak	081233315091	joko_koesnanto@gloriaschool.org	1991-04-05 00:00:00+07	\N
01225	SCOLASTIKA LINTANG RENGGANIS RADITYANI	P	2018-07-09 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	085740087574	scolastika_radityani@gloriaschool.org	1994-06-03 00:00:00+07	9F  C1  14  E6
01312	JENICA SINTYA WINADI	P	2019-03-13 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	081335250025	\N	1994-01-31 00:00:00+07	\N
00238	FEBRYNA HARGYANTI	P	2010-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	\N	\N	1986-02-15 00:00:00+07	\N
01127	IRMA LIMENA	P	2017-07-03 00:00:00+07	\N	Lajang	PART TIME	SD3	Pakuwon City	GURU	GURU	Tidak	085649444414	Irma_limena@yahoo.com	1984-11-17 00:00:00+07	\N
01020	KRIS WANTORO	L	2016-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	085727402403	\N	1992-05-08 00:00:00+07	\N
80041	NATASHA AMANDA	P	2025-09-01 00:00:00+07	\N	Lajang	-	SMA1	Sukomanunggal	NON PEGAWAI	NON PEGAWAI	Aktif	085730340110	natashaamandatio@gmail.com	1995-12-12 00:00:00+07	\N
00059	LAURA DEVINA SAMUEL, S.PD	P	2008-07-15 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Tidak	\N	\N	1982-04-16 00:00:00+07	\N
00536	ELISABETH WIBOWO	P	2012-07-01 00:00:00+07	\N	Cerai	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	082140110975	elisabeth_wibowo@gloriaschool.org	1975-09-10 11:21:51+07	5F  11  14  E6
01417	NOVIANTI YANTI LAPIK	P	2020-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	082344140166	novianti_lapik@gloriaschool.org	1997-11-11 00:00:00+07	\N
01510	ANDREAS BUDIARTO	L	2022-04-18 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	AKUNTING	KARYAWAN	Tidak	085230034088	andreas_budiarto@gloriaschool.org	1991-02-13 00:00:00+07	\N
01357	RUTH PRINCES JULIANA PARDEDE	P	2019-08-01 00:00:00+07	\N	Menikah	FULL TIME	SD1	Pacar	GURU	GURU	Aktif	082364916911	ruth_princes@gloriaschool.org	1986-07-11 00:00:00+07	7F  CC  12  E6
01073	SHARLINI SURYO	P	2016-10-17 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	087835095856	\N	1993-06-02 00:00:00+07	\N
00352	MATHEOS WATTIMENA, SP	L	2002-03-09 00:00:00+07	\N	Menikah	FULL TIME	SATPAM	Kupang Indah	SECURITY	KARYAWAN	Tidak	081332118849	yesdacargo_sub@yahoo.com	1969-04-11 00:00:00+07	\N
00198	KRISTIANTO	L	1999-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Aktif	08121729272	kristianto@gloriaschool.org	1970-03-10 00:00:00+07	9F  69  12  E6
00016	IMANUEL SUGIYONO	L	1989-06-10 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	\N	imanuel_sugiyono@gloriaschool.org	1969-12-16 00:00:00+07	3F  D9  14  E6
00673	RR. FEBRYANE WIDI PARAMITA	P	2013-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	WAKIL KEPALA SEKOLAH	GURU	Aktif	085257824822	febryane_widi@gloriaschool.org	1984-02-02 00:00:00+07	3F  BA  0B  E6
00576	EVODIA AYU SILVIA DEVI	P	2012-09-13 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	085648067789	\N	1990-02-28 00:00:00+07	\N
00418	CENDANA KRISWIDYANOVITA	P	2010-10-04 00:00:00+07	\N	Menikah	FULL TIME	SD1	Pacar	WAKIL KEPALA SEKOLAH	GURU	Aktif	081939101841	cendana_kriswidyanovita@gloriaschool.org	1984-11-11 00:00:00+07	FF  6F  13  E6
00550	RATIH DHIKAPRAMADI PUTRI	P	2012-07-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Tidak	085733282628	\N	1987-03-20 00:00:00+07	\N
80016	ROLANDO SOEGIARTO	L	2025-07-01 00:00:00+07	\N	Lajang	-	SMP1	Kupang Indah	NON PEGAWAI	NON PEGAWAI	Aktif	082232429095	liv.land@yahoo.com	1990-02-18 00:00:00+07	\N
01244	JOSHUA CHRISTIAN PRAWIRO	L	2018-09-17 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	081805487439	\N	1995-01-09 00:00:00+07	\N
00256	SEKTININGSIH	P	2008-07-01 14:02:11+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	081703611731	sektiningsih@gloriaschool.org	1982-12-25 00:00:00+07	3F  5C  0F  E6
01446	RUSIANA TINUS MANDARAU	P	2020-11-17 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	08175211281	rusiana_mandarau@gloriaschool.org	1960-11-16 00:00:00+07:30	\N
01176	AGUS SURYADI	L	2018-01-03 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	082143185868	\N	1986-08-09 00:00:00+07	\N
01351	JESSY THERINDA	P	2019-07-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	08179314250	jessy_therinda@gloriaschool.org	1993-12-14 00:00:00+07	\N
80004	JOKO PRASTYO KOESNANTO	L	2025-07-01 00:00:00+07	\N	Lajang	-	PGTK3	Pakuwon City	NON PEGAWAI	NON PEGAWAI	Aktif	081233315091	joko_koesnanto@gloriaschool.org	1991-04-05 00:00:00+07	\N
00158	OEI MARIANA WIJAYA	P	2010-07-20 00:00:00+07	\N	Menikah	HONORER	PGTK3	Pakuwon City	GURU	GURU	Tidak	\N	\N	1976-11-22 00:00:00+07	\N
00307	YOHANES KURNIA WIJAYA	L	2010-04-01 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	\N	\N	1977-10-04 00:00:00+07	\N
01205	ZEFFIRA B. HIANADI	P	2018-07-02 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	081333096153	zeffira_hianadi@gloriaschool.org	1990-09-19 00:00:00+07	DF  BB  17  E6
01740	HENOKH KRISETYA	L	2025-10-06 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	0882005456671	henokh_krisetya@gloriaschool.org	1999-09-28 00:00:00+07	\N
00038	TUTIK HARYATI	P	1986-07-14 00:00:00+07	\N	Menikah	FULL TIME	SD1	Pacar	GURU	GURU	Tidak	\N	\N	1965-11-07 00:00:00+07	\N
90008	FENDIK	L	2022-07-01 00:00:00+07	\N	Menikah	-	YAYASAN	Kupang Indah	UMUM	OUTSOURCING	Tidak	\N	\N	2000-01-01 00:00:00+07	\N
00089	EKO SUJONO	L	1997-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	\N	eko_sujono@gloriaschool.org	1966-12-04 00:00:00+07	1F  2C  14  E6
01706	AGNIS NITA KRISTIYANA	P	2025-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Aktif	085778700054	agnis_kristiyana@gloriaschool.org	1983-02-14 00:00:00+07	DF  0C  15  E6
01718	NYAMIK ANGGELA NOVIALETA	P	2025-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD1	Pacar	GURU	GURU	Aktif	081217157311	nyamik_novialeta@gloriaschool.org	1997-11-28 00:00:00+07	5F  BD  15  E6
00819	YULIANTO KRISNAWAN	L	2014-08-15 00:00:00+07	\N	Lajang	HONORER	SD3	Pakuwon City	GURU	GURU	Tidak	081331551098	\N	1987-07-05 00:00:00+07	\N
00989	NATALIA DARA PUSPITA	P	2016-04-15 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	081217681686	natalia_dara@gloriaschool.org	1991-12-19 00:00:00+07	3F  C3  11  E6
01074	IVANA YESSICA SETIA PUTRI	P	2016-10-17 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PPM	KARYAWAN	Tidak	085648464777	\N	1993-04-05 00:00:00+07	\N
00510	ERBITETIS MENDROFA	P	2012-01-16 00:00:00+07	\N	TBA	HONORER	SMA2	Pakuwon City	GURU	GURU	Tidak	\N	\N	1986-09-09 14:03:09+07	\N
01354	PRISCA TATUNINGTYAS	P	2019-07-04 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Tidak	081298769568	prisca_tatuningtyas@gloriaschool.org	1985-03-02 00:00:00+07	\N
00874	STEVANUS ELIXER LANGELO	L	2015-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	'082329654541	stevanus_eliser@gloriaschool.org	1991-09-19 00:00:00+07	5F  90  0F  E6
00977	MARTINUS CAHYA WIDHI	L	2016-04-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	085755579555	\N	1994-04-30 00:00:00+07	\N
01180	GIOVANI KARTOSUGONDO	P	2018-01-08 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	MISI DIAKONIA DAN KEROHANIAN	KARYAWAN	Aktif	0817399368	giovani_kartosugondo@gloriaschool.org	1994-11-06 00:00:00+07	1F  73  15  E6
00971	FEBBY ANASTASYA SISWANDINI	P	2016-03-15 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	SUSTER	KARYAWAN	Aktif	081157048201	feby250280@gmail.com	1980-02-25 00:00:00+07	D6  70  FE  19
01208	MERRY SETYARINI	P	2018-07-02 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	BIMBINGAN/KONSELING	GURU	Tidak	081914556089	merry_setyarini@gloriaschool.org	1989-12-29 00:00:00+07	\N
80032	ANDREW KURNIAWAN TJANDRA	L	2025-07-14 00:00:00+07	\N	Menikah	-	SMA2	Pakuwon City	NON PEGAWAI	NON PEGAWAI	Aktif	081307668566	\N	1986-05-01 00:00:00+07	\N
00527	LASMARIA SIMANUNGKALIT	P	2012-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	WAKIL KEPALA SEKOLAH	GURU	Aktif	082140896591	lasmaria_simanungkalit@gloriaschool.org	1988-01-09 00:00:00+07	1F  26  15  E6
00146	IRMA INDRI YANTI	P	2009-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	SUSTER	KARYAWAN	Aktif	\N	irmayanti0915@gmail.com	1980-09-15 00:00:00+07	F6  40  11  1A
01469	TANIA GUNAWAN SUTAJI	P	2021-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	081233840415	tania_gunawan@gloriaschool.org	1996-04-09 00:00:00+07	\N
00477	LIM KRIS YULIANA	P	2011-08-05 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	081232262737	\N	1989-05-02 00:00:00+07	\N
00295	SYANE JOSEPH, ST	P	2008-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	\N	\N	1985-11-18 00:00:00+07	\N
00719	TAUFAN ARDHI WIJAYA	L	2013-10-01 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	082110436460	\N	1980-05-03 00:00:00+07	\N
01214	HAPPY TRIARTA	L	2018-07-02 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	MISI DIAKONIA DAN KEROHANIAN	KARYAWAN	Aktif	082260363030	happy_triarta@gloriaschool.org	1980-11-09 00:00:00+07	BF  2E  0E  E6
01125	MARIA ROSELLA	P	2017-07-03 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	BIMBINGAN/KONSELING	GURU	Tidak	085959293636	maria_rosella@gloriaschool.org	1995-04-05 00:00:00+07	\N
00712	LUCIA NIKEN TYAS UTAMI	P	2013-10-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	085743803007	\N	1990-06-08 00:00:00+07	\N
00139	FELICIA PRISKA	P	2007-05-28 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	082131648339	felicia_priska@gloriaschool.org	1984-05-12 00:00:00+07	BF  55  11  E6
00903	MAHARDHIKA PERMANA PUTERA	L	2015-07-01 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	IT	KARYAWAN	Tidak	082167494170	\N	1992-05-05 00:00:00+07	\N
01075	PRISCA TATUNINGTYAS	P	2016-11-01 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	STAF LITBANG SUPPORT	KARYAWAN	Tidak	081298769568	\N	1985-03-02 00:00:00+07	\N
00208	OMEGAPHANA METHASONA	L	2007-10-01 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	08563351744	omega_sona@gloriaschool.org	1982-08-27 00:00:00+07	DF  4F  16  E6
00997	EVI KRISTIANA	P	2016-05-11 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	TATA USAHA	KARYAWAN	Aktif	081333184694	evi_kristiana@gloriaschool.org	1984-06-28 00:00:00+07	9F  CC  0B  E6
00645	NELVALERINE TIURMA	P	2013-03-06 00:00:00+07	\N	Lajang	PART TIME	SD1	Pacar	GURU	GURU	Tidak	085645050370	\N	1989-09-23 00:00:00+07	\N
01077	ROY ARDIKA GUNOJO	L	2016-12-01 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	085740348725	roy_ardika@gloriaschool.org	1994-08-15 00:00:00+07	7F  80  0B  E6
00927	YUNITA MAYASARI	P	2015-08-19 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	081330736188	\N	1990-06-09 00:00:00+07	\N
01331	SHERLY ANDRIANI	P	2019-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	083874218820	sherly_andriani@gloriaschool.org	1994-09-23 00:00:00+07	DF  39  13  E6
00476	ELVINA TRIXIE	P	2011-08-04 00:00:00+07	\N	TBA	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	087854864237	\N	1987-06-10 00:00:00+07	\N
00711	CRISTOFORUS BOBY NGGADJO WANGGO DJOU	L	2013-09-05 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	TATA USAHA	KARYAWAN	Aktif	081216904202	christoforus_djou@gloriaschool.org	1984-04-20 00:00:00+07	9F  67  10  E6
01423	PRAMEKARDO SIAMBATON	L	2020-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	081377039450	pramekardo_siambaton@gloriaschool.org	1989-02-17 00:00:00+07	3F  11  14  E6
00767	YENY KURNIAWATY	P	2014-07-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	082140073547	yeny_kurniawaty@gloriaschool.org	1987-04-08 00:00:00+07	\N
00956	IMANUEL CATUR OKTANTO SURYOADI	L	2015-12-01 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	081230388603	\N	1978-10-06 00:00:00+07	\N
00796	BELLY ISAYOGA KRISTYOWIDI	L	2014-08-06 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	085645876665	\N	1989-04-15 00:00:00+07	\N
01155	DARMA MEKA	L	2017-09-08 00:00:00+07	\N	Lajang	HONORER	SMA1	Sukomanunggal	GURU	GURU	Tidak	081333363317	\N	1990-02-20 00:00:00+07	\N
01039	TUTIK SURIANTI	P	2016-07-15 00:00:00+07	\N	Menikah	PART TIME	SD2	Kupang Indah	GURU	GURU	Tidak	08123597466	tutiksurianti@gmail.com	1949-02-17 00:00:00+08	\N
00859	ERNATALIYA POERNOMO	P	2015-04-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	UNIT USAHA	KARYAWAN	Tidak	087851199100	\N	1973-12-13 00:00:00+07	\N
00031	PUJIASTUTIK	P	2009-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK1	Pacar	GURU	GURU	Aktif	088803106711	puji_astutik@gloriaschool.org	1979-07-11 00:00:00+07	DF  B9  0B  E6
00369	DAVID TRIYUONO	L	2008-07-15 00:00:00+07	\N	Lajang	FULL TIME	UMUM	Kupang Indah	TEKNISI	KARYAWAN	Tidak	08563642699	\N	1991-01-04 00:00:00+07	\N
01122	RETA ARYANI	P	2017-07-03 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	BIMBINGAN/KONSELING	GURU	Tidak	081326505024	reta_aryani@gloriaschool.org	1991-03-19 00:00:00+07	\N
00172	YANY LUDIA NATASIAN	P	2010-07-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	085655025454	\N	1985-01-22 00:00:00+07	\N
00970	LITA DJUANDI	P	2016-03-10 00:00:00+07	\N	Menikah	PART TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	083857008129	\N	1968-10-29 00:00:00+07	\N
00156	MIFTACHUL CHAIR	L	2009-01-09 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	TATA USAHA	KARYAWAN	Tidak	08564528885	\N	1983-10-31 00:00:00+07	\N
00500	GRACE MERRY ELIZA	P	2011-12-12 00:00:00+07	\N	TBA	FULL TIME	SMP2	Pakuwon City	TATA USAHA	KARYAWAN	Tidak	087855084724	\N	1990-01-24 13:26:07+07	\N
00199	LAURA CAROLINA	P	2010-07-12 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	\N	\N	1984-05-29 00:00:00+07	\N
80024	EKA GILROY KHARIS	L	2025-07-01 00:00:00+07	\N	Menikah	-	SMA2	Pakuwon City	NON PEGAWAI	NON PEGAWAI	Aktif	081519655495	ekagilroy@gmail.com	1995-12-27 00:00:00+07	\N
00190	DYAH PITALOKA AGUNG PUTRI PERDHANI,S.S	P	2009-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	WAKIL KEPALA SEKOLAH	GURU	Aktif	085655246311	dyah_pitaloka@gloriaschool.org	1986-06-19 00:00:00+07	FF  93  14  E6
01597	ARMAND SAMMUEL JOSTANTO	L	2023-07-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	KURIKULUM KBTK-SD	KARYAWAN	Aktif	08123564557	armand_jostanto@gloriaschool.org	1980-09-03 00:00:00+07	0E  78  0C  96
00818	ARNOLD RICKY SAMAR	L	2014-07-21 00:00:00+07	\N	Lajang	HONORER	SMP1	Kupang Indah	GURU	GURU	Tidak	088801547787	\N	1990-04-08 00:00:00+07	\N
00898	LIDYA NOVIANTY	P	2015-07-01 00:00:00+07	\N	Lajang	HONORER	SD2	Kupang Indah	GURU	GURU	Tidak	\N	\N	1990-11-23 00:00:00+07	\N
00170	TRI WAHYUNINGSIH	P	2009-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	SUSTER	KARYAWAN	Aktif	\N	ne2ng.keke@gmail.com	1978-07-30 00:00:00+07	B6  CF  FF  19
01052	RUTH PRINCES JULIANA PARDEDE	P	2016-08-04 00:00:00+07	\N	Menikah	FULL TIME	SD1	Pacar	GURU	GURU	Tidak	082364916911	\N	1986-07-11 00:00:00+07	\N
00935	LEONARDUS IVAN KRISTIAN PRAWITA	L	2015-08-26 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	TATA USAHA	KARYAWAN	Tidak	081226449061	\N	1991-08-06 00:00:00+07	\N
00006	BUDI SULISTYANI , S.SOS	P	2000-02-01 00:00:00+07	\N	Menikah	FULL TIME	SD1	Pacar	GURU	GURU	Aktif	\N	budi_sulistyani@gloriaschool.org	1976-02-15 00:00:00+07	DF  F4  0B  E6
00781	ROBI DHARMAWAN	L	2014-07-01 00:00:00+07	\N	Lajang	PART TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	0896677561786	\N	1987-05-15 00:00:00+07	\N
01709	MARIA ANGELICA HARIYANTO	P	2025-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD1	Pacar	GURU	GURU	Aktif	085103695925	maria_hariyanto@gloriaschool.org	2003-05-29 00:00:00+07	7F  40  17  E6
00519	YAKUB MIRADI	L	2012-04-02 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	PEMBELIAN	KARYAWAN	Tidak	08980090210	\N	1984-03-22 00:00:00+07	\N
00810	FITA YULIANA	P	2014-08-06 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	081553848482	\N	1982-04-14 00:00:00+07	\N
01692	BUNGA CANDRA FARIYAN	P	2025-04-21 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	081231192476	bunga_fariyan@gloriaschool.org	1995-03-27 00:00:00+07	7F  F6  13  E6
00503	NOVILIA FRANSISCA	P	2012-01-03 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	IT	KARYAWAN	Tidak	082140908780	novilia_fransisca@gloriaschool.org	1987-11-12 00:00:00+07	\N
01192	NATANAELIA PUTRI MARISTYA	P	2018-04-03 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	WAKIL KEPALA SEKOLAH	GURU	Aktif	082231341125	natanaelia_putri@gloriaschool.org	1983-05-01 00:00:00+07	1F  D9  14  E6
01221	JULIA PRATICIA TOISUTA	P	2018-07-02 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	085214150318	julia_toisuta@gloriaschool.org	1994-08-21 00:00:00+07	\N
00716	RIZKY SUTIONO	L	2013-09-20 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	LOGISTIK	KARYAWAN	Aktif	082140969555	rizky_sutiono@gloriaschool.org	1986-06-26 00:00:00+07	FF  7C  16  E6
00111	RAYMOND IVANO	L	2008-08-01 00:00:00+07	\N	Menikah	HONORER	SD2	Kupang Indah	GURU	GURU	Tidak	\N	\N	1976-11-24 00:00:00+07	\N
00950	YUNITA MAYASARI	P	2015-10-15 00:00:00+07	\N	Lajang	PART TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	081330736188	\N	1990-06-09 00:00:00+07	\N
00440	EUNIKE SASONGKO, SONG	P	2011-06-20 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	HR	KARYAWAN	Aktif	0817374764	eunike_sasongko@gloriaschool.org	1988-04-20 00:00:00+07	DF  E2  17  E6
01034	HENDRA SULISNO	L	2016-07-15 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	TATA USAHA	KARYAWAN	Tidak	082231678043	\N	1986-06-22 00:00:00+07	\N
00868	ERNANDA ARIWIRAWAN WIDODO	L	2015-05-04 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	TATA USAHA	KARYAWAN	Aktif	085641552605	ernanda_widodo@gloriaschool.org	1990-11-10 00:00:00+07	BF  67  16  E6
80034	YULIA CHRISTIANTI LIEMENA	P	2025-06-15 00:00:00+07	\N	Menikah	-	PGTK3	Pakuwon City	NON PEGAWAI	NON PEGAWAI	Tidak	087751151532	yulia.liemena@gmail.com	1985-07-31 00:00:00+07	\N
00374	SUNARDI	L	1996-03-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	TEKNISI	KARYAWAN	Tidak	\N	\N	1959-08-09 00:00:00+07:30	\N
00281	EVA YUAN SANTOSO UTOMO	P	2009-07-01 00:00:00+07	\N	Lajang	PART TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	081803218232	\N	1983-04-12 00:00:00+07	\N
00539	NORENTISAH SIBURIAN	P	2012-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	085266007554	\N	1985-02-25 00:00:00+07	\N
01622	ESTER PRINCES BANAMTUAN	P	2023-12-04 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	085174111697	ester_banamtuan@gloriaschool.org	1997-11-16 00:00:00+07	\N
00646	KUSTARI EDY ANDJAJA	L	2013-03-08 00:00:00+07	\N	Menikah	HONORER	SMP1	Kupang Indah	GURU	GURU	Tidak	\N	\N	1970-03-15 00:00:00+07	\N
00885	PRI PURWANTI	P	2015-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	085743136999	pri_purwanti@gloriaschool.org	1987-04-03 00:00:00+07	1F  BB  16  E6
01728	SANDRA OKTAVIA SAPUTRA	P	2025-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Aktif	081936671565	sandra_saputra@gloriaschool.org	2000-10-01 00:00:00+07	FF  48  18  E6
01734	RULOFYE MARLISE SITANAYA	P	2025-08-11 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	BIMBINGAN/KONSELING	GURU	Aktif	082233061830	rulofye_sitanaya@gloriaschool.org	1995-10-06 00:00:00+07	3F  E3  17  E6
01247	GERVASIUS RADO	L	2018-09-07 00:00:00+07	\N	Menikah	HONORER	SMP1	Kupang Indah	GURU	GURU	Tidak	082142873900	gervasrado@yahoo.co.id	1973-03-03 00:00:00+07	\N
00019	ISTER ISWANTARI	P	2003-04-15 00:00:00+07	\N	Menikah	FULL TIME	SD1	Pacar	GURU	GURU	Aktif	087854178882	ister_iswantari@gloriaschool.org	1976-12-26 00:00:00+07	7F  FC  0F  E6
00945	JEANE EIRENE	P	2015-10-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	SUSTER	KARYAWAN	Aktif	083830272852	jejeeirene@gmail.com	1994-01-24 00:00:00+07	66  37  DD  19
01547	ANTONY STEVEN ANG	L	2022-10-03 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	HR	KARYAWAN	Aktif	81933017917	antony_ang@gloriaschool.org	1994-03-12 00:00:00+07	DF  15  0E  E6
00895	HENDRA SUSILO	L	2015-08-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	08977104630	hendra_susilo@gloriaschool.org	1989-01-07 00:00:00+07	9F  48  18  E6
00784	JEANLY NOVILLANTI	P	2014-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	083845893776	jeanly_novillanti@gloriaschool.org	1990-11-17 00:00:00+07	\N
01130	FEBBY SANDRA DEVI	P	2017-07-03 00:00:00+07	\N	Lajang	PART TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	0895349928739	\N	1993-02-20 00:00:00+07	\N
01018	FANNY PUSPITA	P	2016-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	082140266076	fanny_puspita@gloriaschool.org	1982-09-10 00:00:00+07	7F  33  10  E6
00217	SYLVI SOEKOTJO, S. T.	P	2004-09-02 00:00:00+07	\N	Menikah	HONORER	SMP1	Kupang Indah	GURU	GURU	Tidak	\N	\N	1978-04-05 00:00:00+07	\N
01201	GITALEWI CHRISTIAN SIGI	L	2018-05-15 00:00:00+07	\N	Menikah	FULL TIME	UMUM	Pakuwon City	TEKNISI	KARYAWAN	Aktif	081235751933	lewi.gita@gmail.com	1988-06-08 00:00:00+07	\N
01339	SALLY	P	2019-07-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Tidak	082132022282	sally@gloriaschool.org	1996-03-05 00:00:00+07	\N
00617	LYDIA ESTER OCTAVIANUS	P	2013-01-07 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	081333912594	\N	1986-05-15 00:00:00+07	\N
01362	SETIAWAN DJUNAIDY	L	2019-08-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	081232356113	setiawan_djunaidy@gloriaschool.org	1993-03-27 00:00:00+07	\N
01377	OSCAR JODI PUTRA	L	2019-09-18 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	081336239200	oscarjodi26@gmail.com	1996-08-26 00:00:00+07	\N
00202	MEITANINGSIH, S. PD.	P	1996-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Aktif	081553110654	meitaningsih@gloriaschool.org	1972-05-18 00:00:00+07	DF  DE  11  E6
00563	SANTO VORMEN	L	2012-08-01 00:00:00+07	\N	Lajang	HONORER	SMA1	Sukomanunggal	GURU	GURU	Tidak	082139958460	\N	1984-07-16 00:00:00+07	\N
00954	RIBKA SOESILO	P	2015-11-10 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	KURIKULUM SMP-SMA	KARYAWAN	Tidak	081219975981	\N	1991-12-05 00:00:00+07	\N
00304	UUT SULISTIN	P	2006-08-01 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	\N	uut_sulistin@gloriaschool.org	1982-12-18 00:00:00+07	1F  E8  16  E6
00560	RUDI KURNIAWAN	L	2012-07-31 00:00:00+07	\N	Menikah	PART TIME	SD1	Pacar	GURU	GURU	Tidak	\N	\N	1983-07-27 00:00:00+07	\N
01538	DESSY LIMANTORO	P	2022-09-08 00:00:00+07	\N	Menikah	PART TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	081357590068	dessylimantoro@yahoo.com	1977-12-01 00:00:00+07	\N
00021	JULLY PANGGAWEAN	P	2010-07-12 00:00:00+07	\N	Menikah	HONORER	SD1	Pacar	GURU	GURU	Tidak	087852643800	jullyphe91@gmail.com	1972-07-12 00:00:00+07	\N
00252	WAHYU CHANDRA	L	2008-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	081234599047	wahyu_candra@gloriaschool.org	1975-05-27 00:00:00+07	3F  F6  17  E6
01145	LISA TANIA TEJO	P	2017-08-10 00:00:00+07	\N	Menikah	HONORER	SD3	Pakuwon City	GURU	GURU	Tidak	081231789585	lisatania89@gmail.com	1989-05-05 00:00:00+07	\N
00007	DEBORA KARTINI MALETA	P	1998-06-15 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Aktif	081235436642	debora_kartini@gloriaschool.org	1972-04-21 00:00:00+07	7F  75  0E  E6
01647	JAMES LIMANTO	L	2024-05-27 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Pakuwon City	GA	KARYAWAN	Aktif	082257826911	james_limanto@gloriaschool.org	2000-07-13 00:00:00+07	DF  F5  17  E6
00748	FRANSISCA ADRIANA	P	2014-05-02 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	IT	KARYAWAN	Tidak	083842256726	\N	1991-07-21 00:00:00+07	\N
00370	HERRI SUMARNO	L	2002-04-01 00:00:00+07	\N	Menikah	FULL TIME	UMUM	Kupang Indah	TEKNISI	KARYAWAN	Aktif	087854069028	herrisumarno@gmail.com	1977-07-28 00:00:00+07	\N
01515	SARAH IVANA MARDIANTO	P	2022-07-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Aktif	089526221012	sarah_mardianto@gloriaschool.org	1997-12-28 00:00:00+07	1F  07  16  E6
01068	IRMA ADELINE	P	2016-09-15 00:00:00+07	\N	Lajang	FULL TIME	PGTK1	Pacar	GURU	GURU	Tidak	081322234912	\N	1990-02-22 00:00:00+07	\N
01137	MALA REJEKI MANURUNG	P	2017-07-24 00:00:00+07	\N	Lajang	FULL TIME	SD1	Pacar	GURU	GURU	Tidak	081285060852	\N	1981-01-15 00:00:00+07	\N
00425	ARDHIANTO HALIM	L	2015-08-01 00:00:00+07	\N	Lajang	HONORER	SMA2	Pakuwon City	GURU	GURU	Tidak	\N	\N	1986-01-24 00:00:00+07	\N
00124	ALEXANDERINA ETHEL JOSEFHINE PATTINAMA	P	2009-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	\N	alexanderina_ethel@gloriaschool.org	1984-07-15 00:00:00+07	5F  E7  12  E6
00242	INDRA WASESA	L	2010-07-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	GA	KARYAWAN	Tidak	0818619488	indra_wasesa@gloriaschool.org	1981-04-26 00:00:00+07	\N
00267	ANITA AMELIA	P	2010-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	081615145010	anita_amelia@gloriaschool.org	1983-10-19 00:00:00+07	FF  28  18  E6
00512	MELIANA GUNAWAN	P	2012-02-29 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	AKUNTING	KARYAWAN	Tidak	08983832230	\N	1989-04-14 00:00:00+07	\N
00588	FRISKA MARGARETA MANUPUTTY	P	2012-09-26 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	SUSTER	GURU	Tidak	085648285401	\N	1991-06-09 00:00:00+07	\N
00827	AGUS SETIO SANTOSO	L	2014-09-24 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	HR	KARYAWAN	Tidak	085697779675	agus_setio@gloriaschool.org	1984-08-05 00:00:00+07	\N
00236	MARIA KUMALASARI	P	2008-06-02 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	TATA USAHA	KARYAWAN	Aktif	087754178214	maria_kumalasari@gloriaschool.org	1979-10-13 00:00:00+07	9F  FE  16  E6
00450	DIAJENG TIARA	P	2011-07-01 00:00:00+07	\N	Lajang	-	PGTK3	Pakuwon City	GURU	GURU	Tidak	085648052374	\N	1988-10-04 00:00:00+07	\N
01206	GENESIS PHILIA WIJAYA	P	2018-07-02 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	BIMBINGAN/KONSELING	GURU	Tidak	085104354350	genesis_philia@gloriaschool.org	1995-12-16 00:00:00+07	\N
00592	DAVID SUSANTO	L	2012-08-03 00:00:00+07	\N	Menikah	HONORER	SMP1	Kupang Indah	GURU	GURU	Tidak	\N	\N	1991-02-26 00:00:00+07	\N
90006	ABRAHAM	L	2022-07-01 00:00:00+07	\N	Lajang	-	YAYASAN	Kupang Indah	UMUM	OUTSOURCING	Tidak	\N	\N	2000-01-01 00:00:00+07	\N
01451	GENESIS PHILIA WIJAYA	P	2021-03-01 00:00:00+07	\N	Lajang	HONORER	SD2	Kupang Indah	GURU	GURU	Tidak	085104354350	genesiswijaya@ukwms.ac.id	1995-12-16 00:00:00+07	\N
00141	HENY DWI ASTUTI	P	2009-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	\N	\N	1984-01-05 00:00:00+07	\N
00647	AGNES LESLIE TALENTIN	P	2013-07-01 00:00:00+07	\N	Lajang	PART TIME	SMA2	#N/A	GURU	GURU	Tidak	085648052088	\N	1988-02-21 00:00:00+07	\N
00833	SILVANA CHARLA SUAWAH	P	2015-03-09 00:00:00+07	\N	Menikah	PART TIME	SD3	Pakuwon City	GURU	GURU	Tidak	081554411490	\N	1978-08-23 00:00:00+07	\N
01593	APRIYANTO SALIM	L	2023-07-01 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	KURIKULUM SMP-SMA	KARYAWAN	Aktif	081217177335	apriyanto_salim@gloriaschool.org	1989-04-18 00:00:00+07	1F  8C  15  E6
00963	DANIEL CHRISTIAN YUNANTO	L	2016-02-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	087852675108	\N	1993-08-27 00:00:00+07	\N
00652	NATALIA SULISTYO VEERMAN	P	2013-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	BIMBINGAN/KONSELING	GURU	Tidak	081934636877	natalia_sulistyo@gloriaschool.org	1984-12-24 00:00:00+07	\N
00504	BODHIYA WIJAYA MULYA	L	2012-01-03 00:00:00+07	\N	TBA	-	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	081803239165	\N	1988-10-01 00:00:00+07	\N
00092	ESTI PAKARYANINGSIH	P	2007-06-18 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	\N	\N	1981-08-27 00:00:00+07	\N
01334	MELIANA SETIAWAN	P	2019-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	081216161300	meliana_setiawan@gloriaschool.org	1998-05-19 00:00:00+07	9F  CF  17  E6
01581	WILLYNGHAM CHRISOPTHOMUS TJIANGGRAWAN	L	2023-05-29 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	085655933221	wchrisopthomus@gmail.com	2000-09-19 00:00:00+07	\N
01393	PRISSILIA RIBKA PERWITASARI	P	2020-01-27 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	BIMBINGAN/KONSELING	GURU	Aktif	081249223639	prissilia_perwitasari@gloriaschool.org	1997-01-23 00:00:00+07	BF  21  0D  E6
00464	RITNA DAMAYANTI	P	2011-07-01 00:00:00+07	\N	Menikah	-	SD3	Pakuwon City	TATA USAHA	KARYAWAN	Tidak	08179522879	\N	1975-11-22 00:00:00+07	\N
00857	KURNIA SETIAWAN	L	2015-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	088801627923	\N	1983-02-17 00:00:00+07	\N
00110	PINA WATI CHOKRO	P	2006-02-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	TATA USAHA	KARYAWAN	Tidak	\N	\N	1978-09-19 00:00:00+07	\N
01061	ADIEK SHEPTINA PUTRI	P	2016-09-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	085755889142	\N	1993-09-16 00:00:00+07	\N
00316	SUGENG PRIBADI	L	2007-10-29 00:00:00+07	\N	Menikah	FULL TIME	UMUM	Kupang Indah	KEBERSIHAN	KARYAWAN	Aktif	083856690296	Sugengpribadipribadi3091@gmail.com	1983-07-16 00:00:00+07	\N
01107	GRATIA FRENA TUMEMBOUW	P	2017-04-25 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	BIMBINGAN/KONSELING	GURU	Aktif	081231470969	gratia_frena@gloriaschool.org	1988-12-01 00:00:00+07	7F  C6  0F  E6
01080	JESSICA GLORIA MARILIM	P	2017-01-09 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	081331950002	jessica_gloria@gloriaschool.org	1993-09-28 00:00:00+07	3F  1E  13  E6
01259	JESSICA NOVIA NILOWARSO	P	2019-01-03 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	BIMBINGAN/KONSELING	GURU	Tidak	08113540950	jessica_nilowarso@gloriaschool.org	1996-01-28 00:00:00+07	\N
01491	MICHELLE NATASHA	P	2021-09-07 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	08123503020	michellemee05@gmail.com	1996-10-05 00:00:00+07	\N
00863	GLORIA PRASETYA KUSUMAWARDANI	P	2015-04-15 00:00:00+07	\N	Lajang	FULL TIME	SD1	Pacar	BIMBINGAN/KONSELING	GURU	Tidak	089675606778	gloria_prasetya@gloriaschool.org	1993-08-21 00:00:00+07	\N
01309	MEGA WAHYU DIONO S.A.	P	2019-02-20 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	AKUNTING	KARYAWAN	Tidak	085733005400	mega_diono@gloriaschool.org	1992-03-16 00:00:00+07	\N
01419	DINCE DINTI BILISTOLEN	P	2020-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	082232369167	dince_bilistolen@gloriaschool.org	1993-12-08 00:00:00+07	\N
01391	DESI ZIDNI AZIZAH	P	2020-01-20 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	PERPUSTAKAAN	KARYAWAN	Aktif	08113341208	desi_azizah@gloriaschool.org	1989-12-13 00:00:00+07	FF  5E  0C  E6
01584	TROFIANSI ROLIAND DALERO	P	2023-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	\N	trofiansi_dalero@gloriaschool.org	1981-04-06 00:00:00+07	9F  FC  0F  E6
00213	SOL MARIE M DIMACLID	P	2009-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	081331511705	\N	1975-02-23 00:00:00+07	\N
90032	DEBORA THERESIA	P	2024-07-01 00:00:00+07	\N	Lajang	-	SD2	Kupang Indah	GURU	OUTSOURCING	Aktif	\N	\N	2000-01-01 00:00:00+07	D6  23  74  1A
00737	YOHANES WELFRED PRAJOGO	L	2014-01-21 00:00:00+07	\N	Lajang	HONORER	SMP1	Kupang Indah	GURU	GURU	Tidak	0818376189	\N	1981-07-25 00:00:00+07	\N
01470	STEVEN AGUNG TRIJANTO	L	2021-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	085156554531	steven_trijanto@gloriaschool.org	1999-06-27 00:00:00+07	3F  40  15  E6
00667	SHIRLY INDAHWATI	P	2013-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	087855145185	\N	1981-09-14 00:00:00+07	\N
00799	THERESIA HESTI KURNIAWATI	P	2014-08-06 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	085743776974	\N	1989-09-20 00:00:00+07	\N
00850	ANDRIA NATAKUSUMA	L	2015-04-06 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	087832880330	\N	1984-06-02 00:00:00+07	\N
90024	EMIELY YUNYUN	P	2024-08-01 00:00:00+07	\N	Lajang	-	YAYASAN	Pakuwon City	SUSTER	OUTSOURCING	Aktif	\N	\N	1945-09-19 00:00:00+09	46  8F  B0  19
00574	YULI RINAWATI	P	2012-09-17 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	TATA USAHA	KARYAWAN	Tidak	085730703189	\N	1977-07-17 00:00:00+07	\N
00250	RANI MARTALINA	P	2010-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	08563396347	rani_martalina@gloriaschool.org	1986-07-14 00:00:00+07	DF  28  18  E6
01233	DAVID SUSANTO	L	2018-08-01 00:00:00+07	\N	Menikah	HONORER	PGTK2	Kupang Indah	GURU	GURU	Tidak	\N	davidsusanto60@gmail.com	1973-07-05 00:00:00+07	\N
01045	FENNY ALFIONNITA	P	2016-07-25 00:00:00+07	\N	Lajang	PART TIME	SD1	Pacar	GURU	GURU	Tidak	082298457086	\N	1992-08-26 00:00:00+07	\N
00832	SURI ANGGERNINGRUM	P	2015-01-12 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	TATA USAHA	KARYAWAN	Tidak	085647062767	\N	1990-08-05 00:00:00+07	\N
01404	MELIANA GUNAWAN	P	2020-06-02 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	KEUANGAN	KARYAWAN	Aktif	08983832230	meliana_gunawan@gloriaschool.org	1989-04-14 00:00:00+07	1F  39  0D  E6
01603	JOYCELIN SAPHIRA KOSASIH	P	2023-08-08 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	BIMBINGAN/KONSELING	GURU	Aktif	085157180668	joycelin_kosasih@gloriaschool.org	2001-11-07 00:00:00+07	5F  32  12  E6
00023	KRISMONO	L	2009-05-01 00:00:00+07	\N	Menikah	FULL TIME	SD1	Pacar	TATA USAHA	KARYAWAN	Tidak	\N	\N	1983-05-18 00:00:00+07	\N
00959	DESANDREW PUDYO TINOTO A. ST	L	2016-01-05 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	087878723707	desandrew_pudyo@gloriaschool.org	1978-12-23 00:00:00+07	3F  F2  0C  E6
00628	NICO SETIAWAN SUSILO	L	2013-02-15 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	081703452484	\N	1989-10-14 00:00:00+07	\N
01524	MARTATRI WAHYUNI	P	2022-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	085735494723	martatri_wahyuni@gloriaschool.org	1996-06-06 00:00:00+07	\N
00996	PURWITANING DYAH RAHAYU	P	2016-05-03 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	085730904033	purwitaning_dyah@gloriaschool.org	1993-04-20 00:00:00+07	FF  E2  0D  E6
90015	M UMAR	L	2022-07-01 00:00:00+07	\N	Menikah	-	YAYASAN	Kupang Indah	UMUM	OUTSOURCING	Tidak	\N	\N	1945-08-17 00:00:00+09	\N
00340	GORIS W.E SABNENO	L	1997-07-01 00:00:00+07	\N	Menikah	FULL TIME	SATPAM	Sukomanunggal	SECURITY	KARYAWAN	Aktif	085234623780	goriswesabneno@gmail.com	1975-11-09 00:00:00+07	\N
00312	R. AGUS AMPERAJITNO	L	2002-10-17 00:00:00+07	\N	Lajang	FULL TIME	UMUM	Kupang Indah	KEBERSIHAN	KARYAWAN	Tidak	081233829845	\N	1966-08-17 00:00:00+07	\N
00441	DINAR KARTIKA ADININGRUM, SST	P	2011-06-06 00:00:00+07	\N	Menikah	FULL TIME	SD1	Pacar	TATA USAHA	KARYAWAN	Aktif	08175288246	dinar_adiningrum@gloriaschool.org	1987-02-06 00:00:00+07	7F  33  0C  E6
01261	ADITYA KRISTIANTO SHAPUTRA	L	2019-01-15 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	GA	KARYAWAN	Tidak	083849335667	\N	1991-04-30 00:00:00+07	\N
00171	WILYANA	P	2012-07-04 00:00:00+07	\N	Menikah	PART TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	\N	\N	1981-03-21 00:00:00+07	\N
01473	MELUR DEWI ANDRIATY ZENDRATO	P	2021-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	081397731721	melur_dewi@gloriaschool.org	1989-09-14 00:00:00+07	\N
00487	SYLVIA WIDYA SANTOSO, S.PD	P	2011-09-15 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Tidak	083849293388	\N	1989-04-08 00:00:00+07	\N
00153	MAGDALENA ERNANTI	P	2009-07-15 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	\N	\N	1980-04-13 00:00:00+07	\N
00458	RENNY SULISTYOWATI	P	2011-07-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	085850175082	\N	1982-01-15 09:24:33+07	\N
01708	BILLY CHRISTIAN JOHAN	L	2025-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	081332588000	billy_johan@gloriaschool.org	1999-09-30 00:00:00+07	5F  D9  14  E6
00630	STEFANUS HARNANIAWAN MULYONO NARTO	L	2013-02-28 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	HR	KARYAWAN	Aktif	081336761131	stefanus_narto@gloriaschool.org	1990-10-05 00:00:00+07	FF  02  13  E6
01390	PUTERI KARTIKA RINI	P	2020-01-17 00:00:00+07	\N	Menikah	PART TIME	SD3	Pakuwon City	GURU	GURU	Tidak	\N	pukarisweet@yahoo.com	1988-06-07 00:00:00+07	\N
00893	AGNES LESLIE TALENTIN, S.PD.	P	2015-07-03 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	WAKIL KEPALA SEKOLAH	GURU	Aktif	085648052088	agnes_leslie@gloriaschool.org	1988-02-21 00:00:00+07	3F  40  17  E6
01260	DANIEL PRATAMA	L	2019-01-04 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Aktif	082301782972	daniel_pratama@gloriaschool.org	1995-05-17 00:00:00+07	3F  39  0B  E6
01542	ABRAHAM ELEAZAR ANUGERAH PUTRA	L	2022-09-19 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	0895327599800	abraham_putra@gloriaschool.org	1999-08-23 00:00:00+07	\N
00465	NIKEN WIRASTUTI	P	2011-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	PERPUSTAKAAN	KARYAWAN	Aktif	083831331194	niken_wirastuti@gloriaschool.org	1979-09-09 00:00:00+07	9F  55  11  E6
00251	RINANTI S.PD	P	2009-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	085732934386	rinanti@gloriaschool.org	1986-02-04 00:00:00+07	BF  A7  17  E6
00914	ABEDNEGO CAHYA PERMADI	L	2015-07-27 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	GA	KARYAWAN	Tidak	08155109110	\N	1989-05-26 00:00:00+07	\N
00056	KIM RUTHIE	P	2008-01-07 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	KEPALA SEKOLAH	GURU	Aktif	081330652033	kim_ruthie@gloriaschool.org	1968-12-20 00:00:00+07	7F  1E  11  E6
01329	YASMIN NOFTRI BATE'E	P	2019-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	081314906077	yasmin_batee@gloriaschool.org	1982-11-03 00:00:00+07	\N
01332	MERRY CHRISTI VERONICA	P	2019-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	085895244423	merry_veronica@gloriaschool.org	1992-12-26 00:00:00+07	\N
00523	SONYA ANDRIYAS	P	2012-05-12 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	081944959746	\N	1980-09-01 00:00:00+07	\N
00634	ELLEN WIJAYA	P	2013-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	085885801498	\N	1991-01-22 00:00:00+07	\N
00534	WENDA ADVISA	P	2012-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	083821316564	wenda_advisa@gloriaschool.org	1988-01-02 00:00:00+07	BF  BB  17  E6
01227	HELEN MELINDA KHO	P	2018-07-09 00:00:00+07	\N	Lajang	PART TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	081333319301	\N	1991-03-09 00:00:00+07	\N
00725	SAPTA DHARMA PUTRA	L	2013-11-11 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	PERPUSTAKAAN	KARYAWAN	Tidak	085641178506	\N	1990-12-20 00:00:00+07	\N
00186	LINDA BUNTORO	P	1999-08-01 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	KEPALA SEKOLAH	GURU	Tidak	0819807703	linda_buntoro@gloriaschool.org	1965-01-28 00:00:00+07	\N
01215	FELIANA HALIM	P	2018-07-05 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	0817587927	feliana_halim@gloriaschool.org	1995-05-21 00:00:00+07	\N
01055	ANABELLA	P	2016-08-01 00:00:00+07	\N	Lajang	HONORER	SMP2	Pakuwon City	GURU	GURU	Tidak	082338806037	\N	1997-01-24 00:00:00+07	\N
00137	ESTER ANGGURITA	P	1998-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	\N	\N	1973-04-27 00:00:00+07	\N
00221	YUDIONO	L	1997-07-14 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	PENGEMBANGAN SDM	KARYAWAN	Tidak	087853160466	yudiono@gloriaschool.org	1968-11-25 00:00:00+07	\N
00109	NOVITA ALAMSYAH	P	2010-07-12 00:00:00+07	\N	Lajang	HONORER	SD2	Kupang Indah	GURU	GURU	Tidak	\N	\N	1974-11-08 00:00:00+07	\N
00179	ARUM WIJAYANI	P	2007-01-22 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	GA	KARYAWAN	Aktif	085731276126	arum_wijayani@gloriaschool.org	1980-10-16 00:00:00+07	3F  A4  15  E6
01674	PRINCESS NATALIE BUDI KRISTWANDA	P	2024-08-12 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	085179753048	princess_kristwanda@gloriaschool.org	2001-12-18 00:00:00+07	BF  B9  0B  E6
01183	MARI INDRIYANI	P	2018-02-05 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	TATA USAHA	KARYAWAN	Aktif	085713824522	mari_indriyani@gloriaschool.org	1995-04-02 00:00:00+07	FF  FC  0F  E6
00836	MICHELLE NATHANIA FENHAN	P	2014-08-01 00:00:00+07	\N	Lajang	HONORER	SMP1	Kupang Indah	GURU	GURU	Tidak	0817580903	\N	1994-06-12 00:00:00+07	\N
00080	DEMAS SUKMONO YATI	L	2010-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	\N	\N	1985-08-31 00:00:00+07	\N
00248	NI GUSTI NYOMAN ESTHERIANI,S.PSI	P	2003-02-02 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	BIMBINGAN/KONSELING	GURU	Aktif	\N	nigustinyoman_estheriani@gloriaschool.org	1980-01-15 00:00:00+07	BF  5F  0E  E6
00571	SUSAN LIANDO	P	2012-09-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	081357327537	\N	1981-02-25 00:00:00+07	\N
01551	BRIGITA GLORIA	P	2022-11-01 00:00:00+07	\N	Lajang	HONORER	SMA2	Pakuwon City	GURU	GURU	Tidak	081365642970	gitagloria9@gmail.com	1996-07-02 00:00:00+07	\N
00724	CHRISTI NATALIA KUSHARNANTO	P	2013-11-01 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	085727241981	christi_natalia@gloriaschool.org	1991-12-20 00:00:00+07	5F  61  14  E6
00071	WENNY METANIA	P	2006-07-12 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	WAKIL KEPALA SEKOLAH	GURU	Aktif	081231390312	wenny_metania@gloriaschool.org	1983-12-14 00:00:00+07	7F  80  0D  E6
01697	VANIA DEWI SUGIHARTO	P	2025-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	085926237456	vania_sugiharto@gloriaschool.org	2001-04-12 00:00:00+07	DF  59  15  E6
01355	V. EKO LANGGENG BAYU WIDODO	L	2019-07-15 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	GA	KARYAWAN	Tidak	081232077386	bayu_widodo@gloriaschool.org	1982-09-12 00:00:00+07	\N
00012	ELOK WIDYANINGSIH	P	1991-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK1	Pacar	GURU	GURU	Aktif	\N	elok_widyaningsih@gloriaschool.org	1972-10-05 00:00:00+07	BF  CC  0B  E6
00995	ANGGELINA KALA INA LIWUN	P	2016-05-02 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	082243445068	anggelina_kala@gloriaschool.org	1991-05-23 00:00:00+07	9F  14  17  E6
01609	TJIE SUN	L	2023-09-22 00:00:00+07	\N	Lajang	PART TIME	PGTK2	Kupang Indah	GURU	GURU	Tidak	08993946685	tjie_sun@gloriaschool.org	1989-05-24 00:00:00+07	\N
00152	LIFEN	P	2010-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	KEPALA SEKOLAH	GURU	Aktif	081216495098	lifen@gloriaschool.org	1980-06-25 00:00:00+07	7F  C4  0C  E6
01484	JEREMY MELVIN LUNTUNGAN	L	2021-08-01 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	082233370742	jeremy_luntungan@gloriaschool.org	1996-01-31 00:00:00+07	\N
00762	TAPARDO NABABAN	L	2014-05-16 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	PENGEMBANGAN SDM	KARYAWAN	Tidak	082132188800	\N	1985-03-25 00:00:00+07	\N
01586	YOHANA THERESIA	P	2023-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	\N	yohana_theresia@gloriaschool.org	2001-06-09 00:00:00+07	1F  33  10  E6
01037	WILYANA	P	2016-07-15 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	08165419406	wilyana@gloriaschool.org	1981-03-21 00:00:00+07	\N
01401	LUSIA STEFANI	P	2020-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	0857087232	lusia_stefani@gloriaschool.org	1987-01-31 00:00:00+07	DF  46  14  E6
01001	NOVIA ANGGUN CHRISTANTI	P	2016-06-15 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	AKUNTING	KARYAWAN	Tidak	082243940837	\N	1991-06-15 00:00:00+07	\N
00985	HERMONY NUGRAHANTO	L	2016-04-02 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	GA	KARYAWAN	Tidak	081233708689	\N	1989-11-05 00:00:00+07	\N
00822	VERONICA VENI RATNASARI	P	2014-09-02 00:00:00+07	\N	Menikah	HONORER	SMA2	Pakuwon City	GURU	GURU	Tidak	083119832519	\N	1984-06-14 00:00:00+07	\N
01685	BAMBANG WIDIYANTO	L	2024-12-19 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	MISI DIAKONIA DAN KEROHANIAN	KARYAWAN	Aktif	\N	bambang_widiyanto@gloriaschool.org	1969-12-19 00:00:00+07	FF  72  15  E6
00745	UMA CHRISTY KUNSITARESMI	P	2014-05-05 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	085727290151	uma_christy@gloriaschool.org	1992-02-08 00:00:00+07	\N
01170	YOHANA INTAN PRATIWI	P	2017-11-21 00:00:00+07	\N	Lajang	FULL TIME	SD1	Pacar	GURU	GURU	Tidak	085741687467	yohana_intan@gloriaschool.org	1995-02-17 00:00:00+07	\N
01138	IVENA MAYCHITA ANGELINA	P	2017-07-24 00:00:00+07	\N	Lajang	FULL TIME	SD1	Pacar	GURU	GURU	Tidak	08993728764	\N	1995-05-12 00:00:00+07	\N
00738	YOLANDA LEONARDY	P	2014-02-03 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	089675673628	\N	1991-07-25 00:00:00+07	\N
00514	ANTHONIO BARRY	L	2012-03-15 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	IT	KARYAWAN	Tidak	081233433063	\N	1982-05-11 00:00:00+07	\N
80017	GALIH JIMMY LAY	L	2025-07-01 00:00:00+07	\N	Lajang	-	SMP2	Pakuwon City	NON PEGAWAI	NON PEGAWAI	Aktif	081359283647	galihjimmylay16@gmail.com	1996-05-18 00:00:00+07	\N
00577	OLIVIA NUGROHO	P	2012-09-17 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	085850655526	\N	1979-04-20 00:00:00+07	\N
00431	FARIDILA WIDJAJA	P	2011-02-22 00:00:00+07	\N	Lajang	PART TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	\N	\N	1983-11-07 00:00:00+07	\N
01023	Y. DWI WULANDARI	P	2016-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	082226237837	\N	1993-01-12 00:00:00+07	\N
00627	PALTI PARLINDUNGAN HUTASOIT	L	2013-02-12 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	LOGISTIK	KARYAWAN	Tidak	081231888987	\N	1987-05-27 00:00:00+07	\N
00008	SIWI BUDIARTI	P	2008-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD1	Pacar	GURU	GURU	Aktif	081230089534	siwi_budiarti@gloriaschool.org	1967-10-06 00:00:00+07	3F  4E  12  E6
90013	LUSI NATALIA	P	2022-04-01 00:00:00+07	\N	Lajang	-	YAYASAN	Kupang Indah	SUSTER	OUTSOURCING	Aktif	\N	\N	2000-01-01 00:00:00+07	B6  E2  D5  19
00695	YUDHIT CIPHARDIAN	L	2013-08-01 00:00:00+07	\N	Menikah	HONORER	SMP2	Pakuwon City	GURU	GURU	Tidak	081332219700	\N	1977-07-20 00:00:00+07	\N
01164	IGNATIO BENIGNO	L	2017-10-30 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	087855858300	ignatio_benigno@gloriaschool.org	1993-10-21 00:00:00+07	5F  CF  17  E6
00400	SUSWATI	P	1996-08-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Pacar	UNIT USAHA	KARYAWAN	Aktif	083856040640	suswati_suswati@gloriaschool.org	1974-08-22 00:00:00+07	BF  C1  14  E6
00823	MONICA HARTONO	P	2014-09-02 00:00:00+07	\N	Lajang	HONORER	SMA2	Pakuwon City	GURU	GURU	Tidak	082338954293	\N	1993-04-24 00:00:00+07	\N
00127	AQUARINA SURYANI, SPD.	P	2009-07-01 00:00:00+07	\N	Cerai	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Aktif	\N	aquarina_suryani@gloriaschool.org	1972-02-13 00:00:00+07	FF  4D  12  E6
00113	SAPTO KARJUNITA, S.SI	P	2003-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	WAKIL KEPALA SEKOLAH	GURU	Aktif	\N	sapto_karjunita@gloriaschool.org	1980-06-27 00:00:00+07	1F  55  13  E6
00878	POPPY MARGARETHA WIBOWO	P	2015-07-01 00:00:00+07	\N	Lajang	PART TIME	SD3	Pakuwon City	GURU	GURU	Tidak	081931001588	\N	1987-03-27 00:00:00+07	\N
00691	ANG NATASIA STEPHANIE SETIYADI	P	2013-07-22 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	081331109528	\N	1990-12-11 00:00:00+07	\N
01165	SABRINA TERTIA DJOENAEDI S.PD	P	2017-11-01 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	081236062086	\N	1989-10-17 00:00:00+07	\N
00348	ANSELMUS RADJA	L	2002-07-06 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	SECURITY	KARYAWAN	Aktif	081331723571	anselradja123@gmail.com	1971-06-09 00:00:00+07	\N
01660	BERNARDINUS DICKSON CARNEGIE MALORING	L	2024-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	089652020999	bernardinus_maloring@gloriaschool.org	1995-05-20 00:00:00+07	9F  09  0D  E6
00005	BAMBANG WIDIYANTO	L	1988-07-11 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	MISI DIAKONIA DAN KEROHANIAN	KARYAWAN	Tidak	\N	bambang_widiyanto@gloriaschool.org	1969-12-19 00:00:00+07	\N
01658	IRENE AYU NINGTYAS	P	2024-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	BIMBINGAN/KONSELING	GURU	Aktif	081249471531	irene_ayuningtyas@gloriaschool.org	1998-06-18 00:00:00+07	9F  D1  16  E6
01558	MARSHELLA RACHEL INTAN K	P	2023-01-03 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	85730946208	Marshella_kristanti@gloriaschool.org	2000-08-03 00:00:00+07	5F  88  0C  E6
00002	ALBERTUS PURWOHARYADI	L	2010-07-21 00:00:00+07	\N	Menikah	HONORER	SD1	Pacar	GURU	GURU	Tidak	\N	\N	1977-10-21 00:00:00+07	\N
00568	RUT TRIWULANDARI	P	2012-08-22 00:00:00+07	\N	Lajang	-	PGTK2	#N/A	SUSTER	#N/A	Tidak	\N	\N	1992-08-29 00:00:00+07	\N
00055	HARI BUDIWALUYO	L	2006-07-24 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Aktif	08175076671	hari_budi@gloriaschool.org	1973-08-12 00:00:00+07	1F  39  0B  E6
01193	NOVIA ANGGUN CHRISTANTI	P	2018-03-23 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	UNIT USAHA	KARYAWAN	Aktif	082243940837	novia_christanti@gloriaschool.org	1991-06-15 00:00:00+07	3F  21  0D  E6
00094	GATOT HARTONO	L	1998-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	081231264476	gatot_hartono@gloriaschool.org	1966-11-23 00:00:00+07	BF  BD  0E  E6
00102	LISA NOVIANI	P	2010-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	08563066184	lisa_noviani@gloriaschool.org	1986-11-19 00:00:00+07	\N
01212	YOHANNA DITA KRISTANTI	P	2018-07-02 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	085702041536	yohanna_kristanti@gloriaschool.org	1996-09-12 00:00:00+07	\N
01006	ELISABETH PURWANTI	P	2016-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	082140438896	elisabeth_purwanti@gloriaschool.org	1977-01-16 00:00:00+07	DF  48  18  E6
01559	RISTO GEROL FOEKH	L	2023-01-03 00:00:00+07	\N	Menikah	PART TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	081249225265	risto_foekh@gloriaschool.org	1991-05-24 00:00:00+07	\N
00867	IVANDER DANIEL WIJAYA	L	2015-04-27 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	BIMBINGAN/KONSELING	GURU	Aktif	082233173205	ivander_daniel@gloriaschool.org	1992-10-12 00:00:00+07	BF  E2  17  E6
01036	WAHYU SANJAYA	L	2016-07-15 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Aktif	082232498010	wahyu_sanjaya@gloriaschool.org	1987-04-12 13:47:38+07	3F  1E  0C  E6
01121	ARDITO DANIEL PRASETYO	L	2017-07-03 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	081217269900	\N	1994-04-26 00:00:00+07	\N
00045	BERITA IBASUKURTA PURBA	P	2001-07-16 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Aktif	0813322550055	berita_ibasukurta@gloriaschool.org	1978-09-25 00:00:00+07	BF  09  0D  E6
00685	FITA YULIANA	P	2013-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	081553848482	\N	1982-04-14 00:00:00+07	\N
00671	NOVITA WIJAYANTI	P	2013-07-01 00:00:00+07	\N	Lajang	PART TIME	PGTK2	Kupang Indah	GURU	GURU	Tidak	08179381080	\N	1988-11-14 00:00:00+07	\N
00966	IDA NOVITA T TOROP	P	2016-02-10 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Aktif	081369323748	ida_novita@gloriaschool.org	1989-11-14 00:00:00+07	DF  2B  14  E6
00926	MICHELLE AURELLIA BUDIYANTO	P	2015-08-18 00:00:00+07	\N	Lajang	PART TIME	SD2	Kupang Indah	GURU	GURU	Tidak	081233828880	\N	1990-03-13 00:00:00+07	\N
01489	ADELIA FRANS SETYANINGTYAS	P	2021-08-16 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	085328388569	adelia_setyaningtyas@gloriaschool.org	1991-02-02 00:00:00+07	\N
00721	DAVID SETIAWAN	L	2013-08-24 00:00:00+07	\N	Lajang	HONORER	SMA1	Sukomanunggal	GURU	GURU	Tidak	\N	\N	1992-09-25 00:00:00+07	\N
00974	NOVITA KURNIAWATI	P	2016-04-15 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	082132026328	novita_kurniawati@gloriaschool.org	1982-05-18 00:00:00+07	5F  CC  12  E6
01540	HENDRI SETIAWAN	L	2022-08-05 00:00:00+07	\N	Menikah	HONORER	SMP1	Kupang Indah	GURU	GURU	Tidak	082244456623	\N	1978-04-27 00:00:00+07	\N
01490	SHANTI HERMAWAN	P	2021-09-06 00:00:00+07	\N	Menikah	HONORER	SD2	Kupang Indah	GURU	GURU	Tidak	085232073050	shanti_hermawan@gloriaschool.org	1983-09-13 00:00:00+07	\N
00992	DEBORA NATALIA FAJARIAWATI	P	2016-05-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Aktif	082226554113	debora_natalia@gloriaschool.org	1990-12-13 00:00:00+07	9F  5F  0E  E6
01315	KURNIYA RATNA SARI	P	2019-04-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	085708585817	kurniya_sari@gloriaschool.org	1993-09-18 00:00:00+07	\N
01252	MICHELLE ALDA GUNAWAN	P	2018-11-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	081236175949	michelle_gunawan@gloriaschool.org	1995-03-28 00:00:00+07	\N
00526	RR.FEBRYANE WIDI PARAMITA	P	2012-07-01 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	085257824822	\N	1984-02-02 10:31:50+07	\N
00166	SOELISTIJANI DARMAWATI	P	1989-09-30 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	\N	sulistiani_darmawati@gloriaschool.org	1965-03-21 00:00:00+07	\N
01048	ADRENG DJURIT PAMUNGKAS	L	2016-08-01 00:00:00+07	\N	Menikah	HONORER	SD2	Kupang Indah	GURU	GURU	Tidak	081246408524	adp_jc.rockon@yahoo.co.id	1986-10-20 00:00:00+07	\N
00821	PRANATA SANTOSO	L	2014-08-15 00:00:00+07	\N	Lajang	HONORER	SMP2	Pakuwon City	GURU	GURU	Tidak	08563040782	\N	1982-10-01 00:00:00+07	\N
01004	DEBORA MULIAWATI	P	2016-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	085697187744	\N	1990-05-11 00:00:00+07	\N
01330	DARMA MEKA	L	2019-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	081703386119	darma_meka@gloriaschool.org	1990-02-20 00:00:00+07	5F  A4  15  E6
00086	DWI RETNO WAHYUNI	P	2001-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	\N	\N	1977-09-27 00:00:00+07	\N
01411	ELIZABETH ITA APULINA GINTING	P	2020-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	085250487793	elizabeth_ginting@gloriaschool.org	1993-03-02 00:00:00+07	5F  1E  11  E6
00583	TAN ALEX GUNAWAN	L	2012-08-13 00:00:00+07	\N	Lajang	HONORER	SMA2	Pakuwon City	GURU	GURU	Tidak	08978088888	\N	1982-10-10 00:00:00+07	\N
00350	IMAM MULYADI	L	2000-11-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	SECURITY	KARYAWAN	Aktif	081803250807	imammulyadio89@gmail.com	1976-01-05 00:00:00+07	\N
00940	YEFTA GAVRA GARLAND PERSADA	L	2015-10-01 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	GA	KARYAWAN	Tidak	082234900029	\N	1993-10-22 00:00:00+07	\N
01513	SYLVIA SIDHARTA	P	2022-07-01 00:00:00+07	\N	Menikah	PART TIME	SD2	Kupang Indah	GURU	GURU	Aktif	0818303340	sylvia_sidharta@gloriaschool.org	1978-06-24 00:00:00+07	32  21  38  5A
00380	DEWI ENDRAWATI	P	2006-08-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	SEKRETARIS	KARYAWAN	Tidak	0811378550	\N	1975-09-15 00:00:00+07	\N
01229	MALA REJEKI MANURUNG	P	2018-07-16 00:00:00+07	\N	Lajang	PART TIME	SD1	Pacar	GURU	GURU	Tidak	081285060852	mala_rejeki@gloriaschool.org	1981-01-15 00:00:00+07	\N
00422	KANGO LUKITO LOK	L	2008-10-15 00:00:00+07	\N	Menikah	-	YAYASAN	Kupang Indah	KOORDINATOR	KARYAWAN	Tidak	\N	\N	1958-03-09 00:00:00+07:30	\N
00049	DWI HARIANI	P	2008-08-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	TATA USAHA	GURU	Tidak	\N	\N	1974-11-19 00:00:00+07	\N
00855	LIDYA RUSLINA	P	2015-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	085730837879	\N	1986-03-14 00:00:00+07	\N
01388	FRAN SISIANA	P	2020-01-02 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	MISI DIAKONIA DAN KEROHANIAN	KARYAWAN	Tidak	089619189940	fran_sisiana@gloriaschool.org	1984-09-16 00:00:00+07	\N
00174	YENLIANA WIJAYA	P	2001-04-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	UNIT USAHA	KARYAWAN	Aktif	0811316466	yenliana_wijaya@gloriaschool.org	1978-11-13 00:00:00+07	DF  A7  17  E6
01690	WU, HSIN- JU	P	2025-02-13 00:00:00+07	\N	Lajang	FULL TIME	SMP3	Grand Pakuwon	GURU	GURU	Aktif	+886931112453	wu_hsinju@gloriaschool.org	1998-06-05 00:00:00+07	7F  DB  13  E6
00047	DEASY CHRISTIN NATALIA LOMBAN	P	2010-07-12 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	SUSTER	GURU	Tidak	\N	\N	1989-12-31 00:00:00+07	\N
00249	OLIVIA SUSANTI	P	2009-07-01 00:00:00+07	\N	Lajang	HONORER	SD1	Pacar	GURU	GURU	Tidak	\N	\N	1984-10-18 00:00:00+07	\N
01430	TERESA AVILLA SUNARSO	P	2020-07-22 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	0816689809	teresa_sunarso@gloriaschool.org	1997-02-19 00:00:00+07	\N
00887	TJHAY SIU FONG, S.PSI.	P	2015-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	BIMBINGAN/KONSELING	GURU	Tidak	087853022442	siu_fong@gloriaschool.org	1993-01-25 00:00:00+07	\N
00356	STEVANUS DILLIA ANDO	L	2007-03-21 00:00:00+07	\N	Menikah	-	SATPAM	Kupang Indah	SECURITY	KARYAWAN	Tidak	\N	\N	1985-11-09 00:00:00+07	\N
01220	REBEKKA HERTI AGUSTIN PARDEDE	P	2018-07-02 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	085261510565	rebekka_pardede@gloriaschool.org	1995-08-04 00:00:00+07	BF  7E  17  E6
80008	VIVIANTI	P	2025-07-01 00:00:00+07	\N	Menikah	-	SD2	Kupang Indah	NON PEGAWAI	NON PEGAWAI	Aktif	08165414178	viviangwie@gmail.com	1975-04-11 00:00:00+07	\N
01333	NATHA BELLA ANGELLA	P	2019-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	081220888387	natha_angella@gloriaschool.org	1996-07-28 00:00:00+07	\N
00463	MINAWATI PRAJOGO	P	2011-07-01 00:00:00+07	\N	Menikah	-	SMP2	Pakuwon City	GURU	GURU	Tidak	0818571098	\N	1966-10-07 00:00:00+07	\N
00099	KRISPINA WONI, S.PD	P	2002-07-18 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	081331003377	\N	1977-04-10 00:00:00+07	\N
01217	SIENNY ANGELIA HUDIONO	P	2018-07-02 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	TATA USAHA	KARYAWAN	Aktif	085730668038	sienny_hudiono@gloriaschool.org	1991-12-15 00:00:00+07	5F  1E  13  E6
00852	ANTON BAHTIAR	L	2015-03-02 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	TATA USAHA	KARYAWAN	Aktif	085790777890	anton_bahtiar@gloriaschool.org	1991-12-30 00:00:00+07	1F  E3  0D  E6
00780	SATRIA PRIYADIKA NUGRAHANINGTYAS	L	2014-06-28 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PMBL-LOG	KARYAWAN	Aktif	08993174516	satria_priyadika@gloriaschool.org	1990-08-22 00:00:00+07	5F  F6  17  E6
90027	MAGDALENA KARTIKASARI	P	2024-10-29 00:00:00+07	\N	Lajang	-	YAYASAN	Pakuwon City	SUSTER	OUTSOURCING	Aktif	\N	\N	1945-11-17 00:00:00+07:30	74  02  D7  30
00399	SRI SUHARTI	P	2003-04-29 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	AKUNTING	KARYAWAN	Aktif	\N	sri_suharti@gloriaschool.org	1971-04-11 00:00:00+07	7F  51  0D  E6
01707	DIVA MEIGA PARWATI	P	2025-07-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Aktif	089630106732	diva_parwati@gloriaschool.org	2002-05-16 00:00:00+07	DF  F2  14  E6
00929	OEI MARIANA WIJAYA	P	2015-08-01 00:00:00+07	\N	Menikah	PART TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	085100089760	\N	1976-11-22 00:00:00+07	\N
00413	EKO FEBRIANTO	L	2010-08-07 00:00:00+07	\N	Menikah	HONORER	SMP1	Kupang Indah	GURU	GURU	Tidak	\N	\N	1981-02-15 00:00:00+07	\N
80026	MICHAEL WIRADINATA	L	2025-07-01 00:00:00+07	\N	Lajang	-	SMA2	Pakuwon City	NON PEGAWAI	NON PEGAWAI	Aktif	087854998822	michael281201@gmail.com	2001-12-28 00:00:00+07	\N
00493	PREBANDANU SATRIO UTOMO	L	2011-10-04 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	TATA USAHA	KARYAWAN	Tidak	\N	\N	1988-02-23 14:26:50+07	\N
00904	LOO DJING LIAN	P	2015-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	082335102942	\N	1988-04-04 00:00:00+07	\N
00792	AGUS BUDI KRISTANTO	L	2014-07-14 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	085746353766	agus_budi@gloriaschool.org	1988-01-13 00:00:00+07	5F  7D  16  E6
00393	LIEM FLORENCE IMAN	P	2002-10-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	UNIT USAHA	KARYAWAN	Tidak	081330683001	\N	1962-09-23 00:00:00+07:30	\N
01072	SIH ELL WAHYU SETIAWAN	L	2016-10-05 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	087737890365	\N	1993-03-07 00:00:00+07	\N
01248	VICTOR INDRA P	L	2018-10-08 00:00:00+07	\N	Lajang	HONORER	SMA1	Sukomanunggal	GURU	GURU	Tidak	08113392304	victorindraa@gmail.com	1989-02-23 00:00:00+07	\N
00342	MARTHEN NICHODEMUS HUWAE	L	2003-04-01 00:00:00+07	\N	Menikah	FULL TIME	SATPAM	Sukomanunggal	SECURITY	KARYAWAN	Aktif	085334573892	marthenaten63@gmail.com	1975-04-17 00:00:00+07	\N
00726	PRISKILA HARLI SISWANTIKA	P	2013-11-11 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	085739784702	\N	1992-02-25 00:00:00+07	\N
01249	Della Christy	P	2018-10-15 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	08113200600	\N	1992-07-11 00:00:00+07	\N
00639	RUT ERRIKA MELATI	P	2013-04-02 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	PERPUSTAKAAN	KARYAWAN	Tidak	085854111258	\N	1989-09-25 00:00:00+07	\N
90010	ANGGI	P	2022-07-01 00:00:00+07	\N	Lajang	-	YAYASAN	Kupang Indah	UMUM	OUTSOURCING	Tidak	\N	\N	2000-01-01 00:00:00+07	\N
01455	TIEN AGUSTRI WIRATNO	P	2021-04-09 00:00:00+07	\N	Menikah	HONORER	SD2	Kupang Indah	GURU	GURU	Tidak	08123274323	tienwiratno@yahoo.co.id	1982-08-07 00:00:00+07	\N
00409	YUSUF MAHDIYANTO	L	2002-04-02 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	GA	KARYAWAN	Aktif	085655406458	yusuf_mahdiyanto@gloriaschool.org	1981-03-16 00:00:00+07	1F  1E  13  E6
00160	RIBKA FERIYANA, DRA	P	1999-08-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	OPERASIONAL KBTK-SD	KARYAWAN	Tidak	0811334138	ribka_feriyana@gloriaschool.org	1961-02-26 00:00:00+07:30	\N
80033	STEFANNY	P	2025-07-14 00:00:00+07	\N	Menikah	-	SMA1	Sukomanunggal	NON PEGAWAI	NON PEGAWAI	Aktif	085163551610	\N	1991-07-01 00:00:00+07	\N
00323	ISTIANAH	P	2001-06-15 00:00:00+07	\N	Menikah	FULL TIME	UMUM	Kupang Indah	KANTIN	KARYAWAN	Tidak	\N	\N	1959-02-09 00:00:00+07:30	\N
00292	LINDA AGUSTIN SUGONDHO	P	2001-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	0818309856	\N	1979-08-23 00:00:00+07	\N
01727	ABISAG NANDA ADI KRISTI	P	2025-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMP3	Grand Pakuwon	GURU	GURU	Aktif	081358679910	abisag_kristi@gloriaschool.org	1999-12-03 00:00:00+07	5F  39  18  E6
01042	SYLVIA SIDHARTA	P	2016-07-15 00:00:00+07	\N	Menikah	PART TIME	SD2	Kupang Indah	GURU	GURU	Tidak	0818303340	\N	1978-06-24 00:00:00+07	\N
80012	MONICA HARTONO	P	2025-07-01 00:00:00+07	\N	Lajang	-	SMP1	Kupang Indah	NON PEGAWAI	NON PEGAWAI	Aktif	082140640012	monica.hartono93@gmail.com	1993-04-24 00:00:00+07	\N
01600	NATALIA ROSLAVINA UTOMO	P	2023-08-03 00:00:00+07	\N	Lajang	HONORER	PGTK2	Kupang Indah	GURU	GURU	Tidak	085786471168	natalia_utomo@gloriaschool.org	2000-12-31 00:00:00+07	\N
80037	STEFANY MARSILEA GLORIE	P	2025-08-01 00:00:00+07	\N	Menikah	-	PGTK2	Kupang Indah	NON PEGAWAI	NON PEGAWAI	Aktif	087887384306	\N	1991-10-06 00:00:00+07	\N
00496	RITOH PARDOMUAN	L	2011-10-21 00:00:00+07	\N	TBA	HONORER	SMP1	Kupang Indah	GURU	GURU	Tidak	085732968632	\N	1987-01-03 00:00:00+07	\N
01474	SANTISIA KURNIAWATI NINGRUM	P	2021-07-19 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	082233806583	santisia_ningrum@gloriaschool.org	1995-07-19 00:00:00+07	\N
00222	ABREDIA LIMANAGO	P	2009-07-01 00:00:00+07	\N	Lajang	PART TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	0818332348	\N	1975-08-08 00:00:00+07	\N
00154	MELIATI	P	2009-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	\N	\N	1981-03-04 00:00:00+07	\N
00946	DESSY SALAMPESSY, SE	P	2015-09-28 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Pakuwon City	UNIT USAHA	KARYAWAN	Tidak	08121678458	\N	1982-11-16 00:00:00+07	\N
01033	YUNING SWASTITI	P	2016-07-15 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	08994721885	yuning_swastiti@gloriaschool.org	1993-01-02 00:00:00+07	9F  41  0F  E6
00223	ADDIANA PRAMUDITARI	P	2010-07-01 00:00:00+07	\N	Menikah	HONORER	SMA2	Pakuwon City	GURU	GURU	Tidak	\N	\N	1982-12-02 00:00:00+07	\N
01477	PAULINE WIDYASTUTI	P	2021-07-21 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	082242457676	pauline_widyastuti@gloriaschool.org	1990-07-28 00:00:00+07	1F  9B  12  E6
01199	JOHANES CHRISOSTOMUS P.	L	2018-04-20 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	GA	KARYAWAN	Tidak	081703303293	johanes_purba@gloriaschool.org	1986-06-10 00:00:00+07	\N
01541	PARANITA RISTIANA MEITJING	P	2022-09-19 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	087781010919	paranita_meitjing@gloriaschool.org	1989-02-02 00:00:00+07	\N
01322	NI WAYAN LILIK PIRAMIDA EKA SARI	P	2019-06-11 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	TATA USAHA	KARYAWAN	Tidak	081547141470	lilypiramida@gmail.com	1995-01-14 00:00:00+07	\N
00589	DIET DIARTO	L	2012-10-11 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Pakuwon City	UMUM	KARYAWAN	Tidak	081515182306	\N	1984-05-05 00:00:00+07	\N
01202	CHRISTIAN SIANTAR	L	2018-07-02 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	081335216888	christian_siantar@gloriaschool.org	1995-06-12 00:00:00+07	\N
01131	THEOFILUS YOSSY CHRISDYANTO	L	2017-07-04 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	085868843143	\N	1995-03-17 00:00:00+07	\N
01038	FANNY PATRICIA SUGIARTO	P	2016-07-15 00:00:00+07	\N	Lajang	PART TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	081333092529	\N	1991-03-04 00:00:00+07	\N
01342	ARLEN MARCIA LEONARD	P	2019-07-01 00:00:00+07	\N	Lajang	PART TIME	SD3	Pakuwon City	GURU	GURU	Tidak	081333506055	arlen_marcia@gloriaschool.org	1993-03-25 00:00:00+07	\N
01386	AMELIA SULISTIAWATI	P	2020-01-02 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	TATA USAHA	KARYAWAN	Tidak	081237622088	amelia_sulistiawati@gloriaschool.org	1996-11-11 00:00:00+07	\N
00683	DHEBORA YUNI WARDANI	P	2013-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	PERPUSTAKAAN	KARYAWAN	Aktif	083856329295	dhebora_wardani@gloriaschool.org	1989-06-05 00:00:00+07	BF  39  13  E6
00679	POPPY UTOMO	P	2013-07-01 00:00:00+07	\N	Lajang	PART TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	089676076515	\N	1991-09-02 00:00:00+07	\N
01177	VANIA MARCELLI GUNAWAN	P	2018-01-08 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	BIMBINGAN/KONSELING	GURU	Tidak	089624341953	vania_marcelli@gloriaschool.org	1991-03-11 00:00:00+07	\N
00432	SUSANDRA LIMANTO	L	2011-02-21 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	ADVISOR GA, PEMBELIAN & LOGISTIK	KARYAWAN	Aktif	08123260183	susandra_limanto@gloriaschool.org	1963-02-18 00:00:00+07:30	3F  09  18  E6
00212	SAHALA PARLINDUNGAN	L	2000-07-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	MISI DIAKONIA DAN KEROHANIAN	KARYAWAN	Aktif	\N	sahala_marpaung@gloriaschool.org	1968-07-31 00:00:00+07	DF  A6  0B  E6
00446	FELICIA SILVANA SETIONO	P	2011-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	081803038115	\N	1989-01-15 00:00:00+07	\N
01232	REBECCA NATALIA	P	2018-08-01 00:00:00+07	\N	Lajang	HONORER	SMP1	Kupang Indah	GURU	GURU	Tidak	08113337788	\N	1994-12-01 00:00:00+07	\N
00219	TUTIK SURIANTI	P	2010-07-12 00:00:00+07	\N	Menikah	HONORER	SD2	Kupang Indah	GURU	GURU	Tidak	\N	\N	1949-04-17 00:00:00+08	\N
00747	IKE MELIANA	P	2014-04-21 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	081933312022	\N	1991-06-29 00:00:00+07	\N
01234	STEFANUS ARI WICAKSONO	L	2018-08-06 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	085338438614	stefanus_wicaksono@gloriaschool.org	1995-12-31 00:00:00+07	DF  75  0F  E6
01128	DORCAS SEFTILIANA TABITA NG.	P	2017-07-03 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	085749760002	\N	1992-09-21 00:00:00+07	\N
01086	NATASYA BINTANG ANDRIYANTI ROBERTO	P	2017-01-25 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	081234220615	\N	1993-07-21 00:00:00+07	\N
00474	YULIA	P	2011-07-01 00:00:00+07	\N	Menikah	-	SMP2	Pakuwon City	GURU	GURU	Tidak	5938082	\N	1981-07-06 00:00:00+07	\N
01184	STEFANY MARSILEA GLORIE	P	2018-01-25 00:00:00+07	\N	Menikah	HONORER	PGTK2	Sukomanunggal	GURU	GURU	Tidak	087887374306	pbgjcreative@gmail.com	1991-10-06 00:00:00+07	\N
00612	ANASTASIA SUSYANI PATTIRUHU	P	2013-01-07 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	081233922933	\N	1982-08-25 00:00:00+07	\N
00595	LIEM, ANDREAS BUDIMAN	L	2012-10-23 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	KURIKULUM SMP-SMA	KARYAWAN	Aktif	08170127429	andreas_budiman@gloriaschool.org	1987-06-03 00:00:00+07	5F  15  0E  E6
00675	DEASY NATALIA INTAN SANTOSO	P	2013-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	085730030593	\N	1989-12-25 00:00:00+07	\N
00194	HANANI RETNA SARI, S. PSI.	P	2009-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	BIMBINGAN/KONSELING	GURU	Tidak	\N	\N	1985-10-30 00:00:00+07	\N
01375	LUKE NUGROHO	L	2019-09-09 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	85856839562	luke_nugroho@gloriaschool.org	1997-01-05 00:00:00+07	9F  69  17  E6
01573	RICKY YONARDI	L	2023-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	BIMBINGAN/KONSELING	GURU	Aktif	081259007868	ricky_yonardi@gloriaschool.org	1993-07-26 00:00:00+07	7F  48  18  E6
00159	PADI	L	2010-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	\N	\N	1980-01-07 00:00:00+07	\N
01108	SHELLY GAUTAMA	P	2017-04-25 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	081210900901	\N	1989-07-05 00:00:00+07	\N
00320	SUTONO	L	1996-07-01 00:00:00+07	\N	Menikah	FULL TIME	UMUM	Kupang Indah	KEBERSIHAN	KARYAWAN	Aktif	081703067613	sutoono1976@gmail.com	1976-06-07 00:00:00+07	\N
00062	NAUMI ERNAWATI	P	1998-11-30 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Tidak	081231211159	\N	1972-09-21 00:00:00+07	\N
01602	YENI TRIVENAWATI	P	2023-07-31 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	085854051997	yeni_trivenawati@gloriaschool.org	1985-10-11 00:00:00+07	\N
00343	SUGITO	L	2001-12-24 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Sukomanunggal	SECURITY	KARYAWAN	Aktif	085820970775	gitos9347@gmail.com	1976-01-01 00:00:00+07	\N
00505	ANDREAS KURNIADI SANTOSO	L	2012-01-03 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	AKUNTING	KARYAWAN	Tidak	087851921932	\N	1986-10-09 00:00:00+07	\N
01666	INDRI MARIANI NAINGGOLAN	P	2024-07-04 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	081239071312	indri_nainggolan@gloriaschool.org	1997-03-10 00:00:00+07	\N
01243	FELICIA LIDWINA EDLIM	P	2018-09-12 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	KEUANGAN	KARYAWAN	Aktif	081232656400	felicia_lidwina@gloriaschool.org	1995-03-23 00:00:00+07	7F  CF  17  E6
01624	JULIA PUTRI PRAMUDITA	P	2023-12-11 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	TATA USAHA	KARYAWAN	Tidak	082230622687	julia_pramudita@gloriaschool.org	1997-07-11 00:00:00+07	\N
01481	JOSHUA CHRISTIAN PRAWIRO	L	2021-08-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	081805487439	joshua_prawiro@gloriaschool.org	1995-01-09 00:00:00+07	DF  06  16  E6
01119	SELVIANA DESI AMBARWATI	P	2017-07-03 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	085799355004	\N	1994-12-13 00:00:00+07	\N
01085	JULI SANDRA KURNIAWATI	P	2017-01-02 00:00:00+07	\N	Lajang	HONORER	SMA2	Pakuwon City	GURU	GURU	Tidak	082231954090	\N	1990-07-06 00:00:00+07	\N
01496	ROY NUGROHO	L	2021-10-18 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Pakuwon City	IT	KARYAWAN	Aktif	085643799972	albert_roynugroho@gloriaschool.org	1991-10-16 00:00:00+07	1F  5C  0B  E6
00812	RAYMOND JOHAN WAHJOEDI	L	2014-08-14 00:00:00+07	\N	Menikah	HONORER	SD2	Kupang Indah	GURU	GURU	Tidak	081803129259	\N	1985-05-07 00:00:00+07	\N
01171	GERALDINE L. ALEXANDRA GONTHA	P	2017-11-27 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	085256780330	\N	1991-11-16 00:00:00+07	\N
00768	YULIANA	P	2014-05-28 00:00:00+07	\N	Menikah	FULL TIME	SD1	Pacar	GURU	GURU	Tidak	085651230098	yuliana@gloriaschool.org	1986-07-13 00:00:00+07	\N
01139	SHIRLEEN GIANINA OENTOENG	P	2017-07-15 00:00:00+07	\N	Lajang	FULL TIME	PGTK1	Pacar	GURU	GURU	Tidak	087852772232	\N	1995-04-06 00:00:00+07	\N
00118	VONNY HALIM	P	2010-08-02 00:00:00+07	\N	Lajang	HONORER	SD2	Kupang Indah	GURU	GURU	Tidak	\N	\N	1987-11-01 00:00:00+07	\N
00986	HERI KRISTANTO	L	2016-02-25 00:00:00+07	\N	Menikah	HONORER	SMP2	Pakuwon City	GURU	GURU	Tidak	085655969111	herikristanto@gmail.com	1978-05-16 00:00:00+07	\N
90002	RIDWAN	L	2022-07-01 00:00:00+07	\N	Menikah	-	YAYASAN	Kupang Indah	UMUM	OUTSOURCING	Tidak	\N	\N	2000-01-01 00:00:00+07	\N
01716	MIKE KARUNIA WATI SIMAMORA	P	2025-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	088238977206	mike_simamora@gloriaschool.org	1998-08-28 00:00:00+07	DF  67  16  E6
01063	RHEMA ALFADION SURYONO	L	2016-09-01 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	082234749432	rhema_alfadion@gloriaschool.org	1994-06-28 00:00:00+07	5F  07  16  E6
00528	PWIE YUNITA PURWOBINTORO	P	2012-07-01 00:00:00+07	\N	Lajang	PART TIME	SD3	Pakuwon City	GURU	GURU	Tidak	087853770218	\N	1985-06-25 00:00:00+07	\N
01626	SANTA ARISANDI ZHAVANA	L	2024-01-16 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	081334958456	santa_zhavana@gloriaschool.org	1992-10-11 00:00:00+07	\N
01083	NOVIA ANGGUN CHRISTANTI	P	2017-01-16 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	AKUNTING	KARYAWAN	Tidak	082243940837	\N	1991-06-15 00:00:00+07	\N
00072	YULIATI	P	1998-09-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	SUSTER	KARYAWAN	Tidak	087853083650	Yuliatioke683@gmail.com	1969-12-16 00:00:00+07	\N
00443	IRLANY HORYANTO	P	2011-07-02 00:00:00+07	\N	Lajang	-	PGTK2	Kupang Indah	GURU	GURU	Tidak	081803271984	\N	1989-10-11 00:00:00+07	\N
00078	CICIK SUCIATI	P	2008-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	\N	cicik_suciati@gloriaschool.org	1975-05-17 00:00:00+07	1F  BD  15  E6
01397	KEVIN MERCO AGASSI P	L	2020-07-01 00:00:00+07	\N	Lajang	PART TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	082232073287 	kevinmerco12@gmail.com	1996-03-22 00:00:00+07	\N
00322	DJUMANI	P	1999-03-15 00:00:00+07	\N	Menikah	FULL TIME	UMUM	Kupang Indah	KANTIN	KARYAWAN	Tidak	\N	\N	1960-06-30 00:00:00+07:30	\N
00274	DESSY LIMANTORO, ST	P	2007-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	\N	\N	1977-12-01 00:00:00+07	\N
00096	SWANDAYANI SISWANDY	P	2006-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	BIMBINGAN/KONSELING	GURU	Tidak	\N	\N	1968-05-18 00:00:00+07	\N
00209	PANCA EKA SEPTIARDI	L	2006-02-01 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	081331414724	\N	1982-10-25 00:00:00+07	\N
00427	IVANA WANGSA DEWI	P	2011-02-14 00:00:00+07	\N	Lajang	HONORER	SD1	Pacar	GURU	GURU	Tidak	08123512315	\N	1984-08-14 00:00:00+07	\N
00376	BOBIE TANAKA	L	2010-08-18 00:00:00+07	\N	Lajang	-	YAYASAN	Kupang Indah	IT	KARYAWAN	Tidak	\N	\N	1992-02-17 00:00:00+07	\N
00834	DEWI ALDADERI TELAUMBANUA	P	2015-01-05 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Aktif	082334593477	dewi_aldaderi@gloriaschool.org	1989-07-21 00:00:00+07	FF  29  0B  E6
01219	TIMBUL BUTAR BUTAR	L	2018-07-02 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	081216329544	timbul_butar@gloriaschool.org	1988-01-12 00:00:00+07	\N
00177	AGUSTINUS MAWAR SETIANTA	L	1996-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Aktif	081331306543	agustinus_mawar@gloriaschool.org	1969-05-27 00:00:00+07	DF  93  0B  E6
00928	ROBIT IRAWAN	L	2015-08-14 00:00:00+07	\N	Menikah	PART TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	081217441996	\N	1962-05-01 00:00:00+07:30	\N
00659	YANTI BR SIJABAT	P	2013-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	085262303008	yanti_sijabat@gloriaschool.org	1989-09-01 00:00:00+07	9F  A7  17  E6
00541	ERICO KAMARUDDIN	L	2012-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	08123298345	\N	1975-12-02 00:00:00+07	\N
01714	PETRUS PURNOMO	L	2025-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	081316841955	petrus_purnomo@gloriaschool.org	1990-03-28 00:00:00+07	\N
00121	YOSEF CHRISTIAWAN	L	2013-07-01 00:00:00+07	\N	Menikah	PART TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	085648012604	\N	1984-12-27 00:00:00+07	\N
00473	YENNY IMELDA CISILIA MEWOH	P	2011-07-11 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	082131644710	\N	1981-06-03 00:00:00+07	\N
00983	ELLY SANTA MARIANA	P	2016-04-04 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	TATA USAHA	KARYAWAN	Aktif	087853111984	elly_mariana@gloriaschool.org	1983-02-22 00:00:00+07	9F  9B  0C  E6
00742	FELICIA SUNARYO	P	2014-03-06 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	SEKRETARIS	KARYAWAN	Tidak	081333032158	\N	1990-01-09 00:00:00+07	\N
00315	SLAMET RIYADI	L	1999-07-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	KEBERSIHAN	KARYAWAN	Tidak	085648571118	rizkydt767@gmail.com	1975-02-12 00:00:00+07	\N
00401	TANTI DJUWITA	P	2009-12-15 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	IT	KARYAWAN	Tidak	085776269772	tanti_djuwita@gloriaschool.org	1970-06-08 00:00:00+07	\N
00854	AGUNG EKA NURCAHYO	L	2015-03-16 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	TATA USAHA	KARYAWAN	Tidak	085604004387	\N	1986-07-07 00:00:00+07	\N
00545	KRISTIN ANDRILIANI	P	2012-07-01 00:00:00+07	\N	Lajang	PART TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	087855509801	\N	1989-11-29 00:00:00+07	\N
01694	DHEA CATUR DINDA RISTYANA	P	2025-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	083831800014	dhea_ristyana@gloriaschool.org	1998-03-14 00:00:00+07	7F  8C  15  E6
00664	VICTORIA WOEN	P	2013-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD1	Pacar	GURU	GURU	Tidak	085732500572	\N	1983-11-14 00:00:00+07	\N
00027	LINDA WIDYASTUTI	P	1999-01-10 00:00:00+07	\N	Menikah	FULL TIME	SD1	Pacar	GURU	GURU	Aktif	081330430132	linda_widyastuti@gloriaschool.org	1976-01-08 00:00:00+07	7F  A6  0B  E6
00034	SITI YULAIKAH	P	2007-01-05 00:00:00+07	\N	Menikah	FULL TIME	PGTK1	Pacar	SUSTER	KARYAWAN	Aktif	081357358552	sitiyulaikah706@gmail.com	1982-04-23 00:00:00+07	14  CC  D0  30
00993	RENY OKTAVIA	P	2016-05-02 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	SUSTER	KARYAWAN	Tidak	083830489469	\N	1984-10-24 00:00:00+07	\N
00163	ROHANI	P	2009-06-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	\N	rohani@gloriaschool.org	1976-09-28 00:00:00+07	3F  27  0F  E6
00594	RIBKA AGUSTININGRUM	P	2015-07-15 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	087852733605	ribka_agustiningrum@gloriaschool.org	1989-08-11 00:00:00+07	DF  D5  15  E6
00905	FILOLOGOS ZAKARIA	L	2015-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	08123169847	filologos_zakari@gloriaschool.org	1992-09-04 00:00:00+07	9F  02  13  E6
01179	ENGGA WAHYU ARDANA SARI	P	2018-01-08 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Aktif	081233932462	engga_wahyu@gloriaschool.org	1991-06-16 00:00:00+07	DF  8C  0E  E6
01348	GONAWAN RONALD JEFFERSON	L	2019-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	089696274189	gonawan_jefferson@gloriaschool.org	1995-05-29 00:00:00+07	3F  6A  18  E6
01715	SYOS AMBARWATI	P	2025-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD4	Grand Pakuwon	GURU	GURU	Aktif	082313216873	syos_ambarwati@gloriaschool.org	1998-04-16 00:00:00+07	DF  1F  16  E6
00674	SYANE JOSEPH	P	2013-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	08175088611	\N	1985-11-18 00:00:00+07	\N
00193	ERTIN PUSPITARINI	P	2010-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	\N	\N	1982-08-24 00:00:00+07	\N
01405	APRIYANTO SALIM	L	2020-04-16 00:00:00+07	\N	Lajang	PART TIME	YAYASAN	Kupang Indah	KURIKULUM SMP-SMA	KARYAWAN	Tidak	08811026805	apriyanto_salim@gloriaschool.org	1989-04-18 00:00:00+07	\N
00161	RICHARD SAMUEL LIEJANTO	L	2010-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	\N	\N	1985-12-11 00:00:00+07	\N
00245	MAYA VIRGINA	P	2006-11-19 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	\N	\N	1981-09-04 00:00:00+07	\N
01424	MICHAEL TANUWIJAYA	L	2020-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	081231825564	michael_tanuwijaya@gloriaschool.org	1998-05-29 00:00:00+07	\N
01663	ELMIWATI DEWI SUSANTI	P	2024-07-01 00:00:00+07	\N	Lajang	PART TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	081335365380	elmiwati_dewi@gloriaschool.org	1987-09-05 00:00:00+07	BC  96  A3  D3
00981	MICHAEL KEVINDIE SETYAWAN	L	2016-03-28 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	GA	KARYAWAN	Tidak	081231809979	\N	1993-08-21 00:00:00+07	\N
00979	YOHANA DEVITA ANGELIA	P	2016-04-15 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	08563169455	yohana_devita@gloriaschool.org	1993-05-20 00:00:00+07	1F  E3  17  E6
00805	RUTH PRINCES JULIANA PARDEDE	P	2014-08-15 00:00:00+07	\N	Menikah	FULL TIME	PGTK1	Pacar	GURU	GURU	Tidak	082364916911	\N	1986-07-11 00:00:00+07	\N
01081	BUDI SUSANTO	L	2017-01-09 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	0816607734	budi_susanto@gloriaschool.org	1980-11-12 00:00:00+07	1F  6A  18  E6
01550	STEFANY ERICA SUTANTO	P	2022-10-27 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	AKUNTING	KARYAWAN	Tidak	081230303412	stefany_sutanto@gloriaschool.org	1988-04-14 00:00:00+07	\N
01637	FEBRIAN FALENTINO FREDRIKTHO	L	2024-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	08175240954	febrian_fredriktho@gloriaschool.org	2024-03-16 00:00:00+07	\N
00883	TIEN AGUSTRI WIRATNO	P	2015-05-29 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	08123274323	tien_agustri@gloriaschool.org	1982-08-07 00:00:00+07	\N
01158	STEPHANIE VANESSA WIDYAWATI	P	2017-10-02 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	081336631255	stephanie_vanessa@gloriaschool.org	1995-06-17 00:00:00+07	\N
01152	MEIDYAWATI NJONOSAPUTRO	P	2017-09-06 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	08123047239	\N	1978-05-15 00:00:00+07	\N
01123	TEOFILUS LIMBONGAN	L	2017-07-03 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	081331228160	teofilus_limbongan@gloriaschool.org	1982-08-28 00:00:00+07	5F  C6  0F  E6
00625	RINAWATI SUTANTO	P	2013-02-01 00:00:00+07	\N	Menikah	PART TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	\N	\N	1952-09-02 00:00:00+07:30	\N
00351	KOMARUDIN	L	1996-08-12 00:00:00+07	\N	Menikah	FULL TIME	SATPAM	Kupang Indah	SECURITY	KARYAWAN	Tidak	085850657276	udinkomar114@gmail.com	1967-08-04 00:00:00+07	\N
00097	IRMA NATALIA	P	2008-08-01 00:00:00+07	\N	TBA	HONORER	SD2	Kupang Indah	GURU	GURU	Tidak	\N	\N	1980-12-02 00:00:00+07	\N
90022	JESICA WAHONGAN	P	2024-01-01 00:00:00+07	\N	Lajang	-	PGTK2	Kupang Indah	GURU	OUTSOURCING	Tidak	\N	\N	1995-01-19 00:00:00+07	\N
00540	EK MELLISA ANNASTASIA, SE	P	2012-07-01 00:00:00+07	\N	Cerai	FULL TIME	SMA1	Sukomanunggal	WAKIL KEPALA SEKOLAH	GURU	Aktif	082244695544	ek_mellisa@gloriaschool.org	1991-01-01 00:00:00+07	1F  CC  12  E6
00188	DRI HERIJANTO	L	2010-03-01 00:00:00+07	\N	Menikah	PART TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	085642355144	\N	1956-03-14 00:00:00+07:30	\N
90019	MEISKE G. Y. GERVASIUS	P	2023-07-24 00:00:00+07	\N	Lajang	-	YAYASAN	Kupang Indah	SUSTER	OUTSOURCING	Tidak	\N	\N	1945-08-17 00:00:00+09	\N
00930	SANDRA SARI ELISABETH	P	2015-07-03 00:00:00+07	\N	Lajang	PART TIME	SD1	Pacar	GURU	GURU	Tidak	085854224522	\N	1987-04-06 00:00:00+07	\N
00771	REZHA KHARISMA PUTRI	P	2014-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	081805143324	rezha_kharisma@gloriaschool.org	1991-08-15 00:00:00+07	DF  38  18  E6
00470	DJUWITA ANGKAWIJAYA	P	2011-06-20 00:00:00+07	\N	Menikah	-	YAYASAN	Kupang Indah	PPM	KARYAWAN	Tidak	08123319161	\N	1976-04-02 00:00:00+07	\N
00976	ANGELA YESA KURNIASARI	P	2016-04-01 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	085725121810	angela_yesa@gloriaschool.org	1993-01-13 00:00:00+07	3F  07  16  E6
00367	FERKY BERTUS JERMIAS BENU	L	2005-02-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Pakuwon City	UMUM	KARYAWAN	Aktif	081330135190	ferkybertusbenu@gmail.com	1985-05-18 00:00:00+07	\N
80030	FELISA AMADEA LIMANTO	P	2025-07-01 00:00:00+07	\N	Lajang	-	SMP3	Grand Pakuwon	NON PEGAWAI	NON PEGAWAI	Aktif	081231794535	felisa_limanto@gloriaschool.org	1998-08-24 00:00:00+07	\N
01465	GRACE PERMATA HATI	P	2021-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	082331265913	grace_permata@gloriaschool.org	1998-01-12 00:00:00+07	\N
00088	EKO HERU PRASETYO	L	2009-06-08 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	085731948170	heru_prasetyo@gloriaschool.org	1986-06-18 00:00:00+07	\N
01238	KRISTI WANANTRA	L	2018-08-01 00:00:00+07	\N	Menikah	HONORER	SMP2	Pakuwon City	GURU	GURU	Tidak	087786368842	johannezkristi86@gmail.com	1986-09-10 00:00:00+07	\N
01209	HASPRITA R. BR. MANGOENSONG	P	2018-07-02 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	089676347837	hasprita_mangunsong@gloriaschool.org	1995-01-07 00:00:00+07	\N
00980	PAULINA SHEREN SANTOSA	P	2016-04-15 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	085736858359	paulina_sheren@gloriaschool.org	1993-05-09 00:00:00+07	\N
01402	STEVANIE PAULINA	P	2020-07-01 00:00:00+07	\N	Menikah	HONORER	PGTK2	Kupang Indah	GURU	GURU	Tidak	081357707625	stevanie.paulina2810@gmail.com	1994-10-28 00:00:00+07	\N
01421	FELICIA THEDORES	P	2020-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	081218613821	felicia_thedores@gloriaschool.org	1997-08-15 00:00:00+07	\N
01458	DEVANDA ANTONIUS YAHYA. R	L	2021-05-17 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	GA	KARYAWAN	Tidak	082257484946	devanda_yahya@gloriaschool.org	1998-01-01 00:00:00+07	\N
00557	IRENNA SETYANI	P	2012-08-27 00:00:00+07	\N	Lajang	HONORER	SMA1	Sukomanunggal	GURU	GURU	Tidak	08231888149	\N	1987-07-30 00:00:00+07	\N
00003	ANNEKE RM. TENDUR	P	1985-11-01 00:00:00+07	\N	Menikah	FULL TIME	SD1	Pacar	GURU	GURU	Tidak	085731173870	anneke_tendur@gloriaschool.org	1960-05-03 00:00:00+07:30	\N
00018	ISA LESMANA	L	2008-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD1	Pacar	WAKIL KEPALA SEKOLAH	GURU	Tidak	\N	isa_lesmana@gloriaschool.org	1979-08-11 00:00:00+07	\N
01710	ANTHONY MARDINATA HASAN	L	2025-04-05 00:00:00+07	\N	Menikah	PART TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	\N	anthony_hasan@gloriaschool.org	1991-03-03 00:00:00+07	\N
01621	YUDIONO	L	2023-11-25 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	PENGEMBANGAN SDM	KARYAWAN	Aktif	087853160466	yudiono@gloriaschool.org	1968-11-25 00:00:00+07	9F  FC  0D  E6
01028	FERNANDA EKA DEFANTY	P	2016-07-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	SUSTER	KARYAWAN	Tidak	085336414621	\N	1998-06-21 00:00:00+07	\N
01664	IRENE JESSICA GUNAWAN	P	2024-07-01 00:00:00+07	\N	Lajang	PART TIME	SD2	Kupang Indah	GURU	GURU	Aktif	081331824881	irene_gunawan@gloriaschool.org	2000-04-22 00:00:00+07	82  7E  36  5A
01648	RUTH STELLA NATHANIEL	P	2024-07-01 00:00:00+07	\N	Lajang	HONORER	SD2	Kupang Indah	GURU	GURU	Tidak	08119430081	rthnatha@gmail.com	2000-02-17 00:00:00+07	\N
00741	RIKKO ANGGARA	L	2014-03-03 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	085649466661	\N	1990-01-02 00:00:00+07	\N
01619	CHRISTINA	P	2024-01-03 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	082231676418	christina@gloriaschool.org	1992-03-16 00:00:00+07	\N
00580	YONAS SAPUTRA	L	2012-09-01 00:00:00+07	\N	Lajang	PART TIME	SD3	Pakuwon City	GURU	GURU	Tidak	081235846611	\N	1985-09-06 00:00:00+07	\N
00379	DAVIT RIJADI	L	2006-03-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	IT	KARYAWAN	Tidak	\N	\N	1972-07-09 00:00:00+07	\N
00888	IRMA DWI SETYOWATI	P	2015-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	085740118981	\N	1991-04-10 00:00:00+07	\N
00561	CECILIA BAREK LAWE	P	2012-07-31 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	089652191990	\N	1990-09-01 00:00:00+07	\N
01441	HASPRINA RESMANIAR BORU MANGOENSONG	P	2020-08-06 00:00:00+07	\N	Lajang	HONORER	PGTK2	Kupang Indah	GURU	GURU	Tidak	081235178056	mangunsongresma@gmail.com	1993-07-01 00:00:00+07	\N
00877	FREDDY MUTIARA	L	2015-06-15 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	KURIKULUM SMP-SMA	KARYAWAN	Tidak	08881428327	\N	1978-10-25 00:00:00+07	\N
01172	YASMIN NOFTRI BATE'E	P	2018-01-02 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	UNIT USAHA	KARYAWAN	Tidak	081314906077	\N	1982-11-03 00:00:00+07	\N
01094	MEGA LOVRINA	P	2017-03-15 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	081333620082	\N	1992-09-08 00:00:00+07	\N
01002	MAYNARD PAUL POLI	L	2016-06-15 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	08980950682	\N	1990-05-01 00:00:00+07	\N
01412	CHARLIE SETIAWAN LIEUSBUN	L	2020-07-01 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	081233818170	charlie_lieusbun@gloriaschool.org	1992-05-16 00:00:00+07	BF  1F  16  E6
00289	KENNEDY YUANDY. ST	L	2002-07-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	HR	KARYAWAN	Aktif	08165430602	kennedy_yuandy@gloriaschool.org	1974-01-06 00:00:00+07	1F  E1  0B  E6
01303	SUKMA YENTI	P	2019-02-04 00:00:00+07	\N	Menikah	PART TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	0852652226419	suyen_kho@yahoo.com	1981-09-01 00:00:00+07	\N
00366	MASHUDA	L	1996-06-10 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Pacar	UMUM	KARYAWAN	Tidak	\N	\N	1967-12-01 00:00:00+07	\N
00377	CHRISTINE HALIM	P	2002-06-24 00:00:00+07	\N	Menikah	PART TIME	YAYASAN	Kupang Indah	KURIKULUM KBTK-SD	KARYAWAN	Tidak	08123125681	\N	1950-10-30 00:00:00+07:30	\N
00513	DJUWANDA	L	2012-02-17 00:00:00+07	\N	TBA	HONORER	SMP1	Kupang Indah	GURU	GURU	Tidak	081703109330	\N	1977-04-23 00:00:00+07	\N
01168	TRIYANAH	P	2017-11-20 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	087859241137	\N	1980-02-02 00:00:00+07	\N
00604	ELISABET NILA PRAPITA SARI	P	2012-11-06 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Aktif	082139506742	elisabet_nila@gloriaschool.org	1990-01-25 00:00:00+07	DF  B0  10  E6
00871	MAJU PARULIAN GULTOM	L	2015-05-04 00:00:00+07	\N	Menikah	FULL TIME	SMP1	Kupang Indah	TATA USAHA	KARYAWAN	Tidak	082165351408	maju_gultom@gloriaschool.org	1979-02-26 00:00:00+07	\N
01302	DWIKI AYU SRI MARETA	P	2019-02-01 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	081233690085	\N	1992-03-12 00:00:00+07	\N
00079	CITRA SRISATYA PERMATASARI, S.SI.	P	2009-05-18 00:00:00+07	\N	Lajang	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	\N	\N	1986-06-06 00:00:00+07	\N
90003	VICTOR	L	2022-07-01 00:00:00+07	\N	Lajang	-	YAYASAN	Kupang Indah	UMUM	OUTSOURCING	Tidak	\N	\N	2000-01-01 00:00:00+07	\N
01058	ROLANDO SOEGIARTO	L	2016-08-05 00:00:00+07	\N	Lajang	HONORER	SMP1	Kupang Indah	GURU	GURU	Tidak	082232429095	liv.land@yahoo.com	1990-02-18 00:00:00+07	\N
00192	ERI JESIKA NEAS	L	1996-07-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	UNIT USAHA	KARYAWAN	Aktif	082234715005	eri_neas@gloriaschool.org	1974-02-17 00:00:00+07	DF  19  18  E6
00913	STEFANY	P	2015-07-01 00:00:00+07	\N	Lajang	HONORER	SMP2	Pakuwon City	GURU	GURU	Tidak	081703087038	\N	1996-09-30 00:00:00+07	\N
00383	ELISYE RETNOWATI	P	2004-11-22 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	AKUNTING	KARYAWAN	Aktif	085731538566	elisye_retnowati@gloriaschool.org	1982-03-04 00:00:00+07	1F  A4  0E  E6
00840	FANNY PATRICIA SUGIARTO	P	2015-03-02 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	081333092529	\N	1991-03-04 00:00:00+07	\N
01599	PAULINA GLORIA NOVIANTI L. TOBING	P	2023-07-27 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	08563465369	paulina_tobing@gloriaschool.org	1986-11-18 00:00:00+07	\N
00416	ANTON SOEGIARTO	L	2010-08-02 00:00:00+07	\N	Lajang	HONORER	SMP2	Pakuwon City	GURU	GURU	Tidak	\N	\N	1986-08-05 00:00:00+07	\N
00286	HERDIAN NUGROHO	L	2006-08-16 00:00:00+07	\N	Menikah	FULL TIME	SMA1	Sukomanunggal	TATA USAHA	KARYAWAN	Aktif	\N	herdian_nugroho@gloriaschool.org	1983-08-24 00:00:00+07	BF  6E  0B  E6
01240	DINA MARIA MAGDALENA LAY	P	2018-08-15 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Pakuwon City	GA	KARYAWAN	Tidak	082230582990	\N	1990-10-18 00:00:00+07	\N
00606	AGNES KRISANTI WIDYANING	P	2012-11-20 00:00:00+07	\N	Menikah	FULL TIME	SMP2	Pakuwon City	TATA USAHA	KARYAWAN	Tidak	08563274063	agnes_widyaning@gloriaschool.org	1990-07-08 00:00:00+07	\N
00230	PENI LESTARI	P	1997-07-28 00:00:00+07	\N	Lajang	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Aktif	087851130600	cecilia_peni@gloriaschool.org	1968-11-08 00:00:00+07	DF  69  12  E6
00785	LAN NINGSIH	P	2014-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	082140648891	\N	1978-12-16 00:00:00+07	\N
00298	PRISKILA NATALIA	P	2009-08-06 00:00:00+07	\N	Menikah	PART TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	\N	\N	1986-12-17 00:00:00+07	\N
01324	FRISCHA EZRA CHRISTINA	P	2019-06-12 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	UNIT USAHA	KARYAWAN	Aktif	081381804411	frischa_christina@gloriaschool.org	1992-06-11 00:00:00+07	7F  71  11  E6
00387	HENNIE SUSANA	P	2003-01-31 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Pakuwon City	UNIT USAHA	KARYAWAN	Aktif	\N	hennie_susana@gloriaschool.org	1972-09-04 00:00:00+07	DF  9A  12  E6
01520	BETHA RIANA CITRA SRITOSA	P	2022-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMP3	Grand Pakuwon	GURU	GURU	Aktif	081291261025	betha_sritosa@gloriaschool.org	1997-07-27 00:00:00+07	7F  D7  0E  E6
00715	RUTH IVANA POEDJIANTO	P	2013-09-30 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	INTERNAL AUDIT	KARYAWAN	Tidak	085852870207	\N	1988-07-06 00:00:00+07	\N
00448	WAHYU CHRISTIANI	P	2011-05-23 00:00:00+07	\N	Menikah	FULL TIME	PGTK3	Pakuwon City	SUSTER	KARYAWAN	Tidak	\N	\N	1986-03-31 00:00:00+07	\N
01668	SIH ELL WAHYU SETIAWAN	L	2024-07-18 00:00:00+07	\N	Menikah	PART TIME	SD4	Grand Pakuwon	GURU	GURU	Tidak	081336078394	sih_setiawan@gloriaschool.org	1993-03-07 00:00:00+07	\N
01654	JANTENG STEPANUS	L	2024-06-24 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	IT	KARYAWAN	Aktif	082300008060	janteng_stepanus@gloriaschool.org	1992-12-26 00:00:00+07	5F  BA  0B  E6
01379	GERRY OKTAVIANO GABELER	L	2019-10-14 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	PPM	KARYAWAN	Aktif	082131472136	gerry_oktaviano@gloriaschool.org	1989-10-01 00:00:00+07	9F  BB  17  E6
01395	NICHOLAS PAUL SANTOSA	L	2020-02-24 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	AKUNTING	KARYAWAN	Tidak	082213304177	paulsantosanicholas@gmail.com	1996-11-20 00:00:00+07	\N
00717	PRANATA SANTOSO	L	2013-08-20 00:00:00+07	\N	Lajang	HONORER	SMA2	#N/A	GURU	GURU	Tidak	\N	\N	1982-10-01 00:00:00+07	\N
01032	DESSY SALAMPESSY, SE	P	2016-07-15 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	LABORAN	KARYAWAN	Aktif	08121678458	dessy_salampessy@gloriaschool.org	1982-11-16 00:00:00+07	3F  CA  0D  E6
01560	YEMIMA FLORENTINA	P	2023-01-04 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	81283836939	yemima_florentina@gloriaschool.org	1997-04-01 00:00:00+07	\N
01507	MARTIN JOHN PULLEN	L	2022-07-01 00:00:00+07	\N	Menikah	FULL TIME	SD4	Grand Pakuwon	GURU	GURU	Tidak	085947592626	martin_pullen@gloriaschool.org	1981-12-01 00:00:00+07	\N
00569	AGNES	P	2012-07-21 00:00:00+07	\N	Lajang	HONORER	SMP1	Kupang Indah	GURU	GURU	Tidak	087853331441	\N	1991-08-15 00:00:00+07	\N
01385	VIONITA HERYUGIPRATIWI	P	2019-12-11 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	AKUNTING	KARYAWAN	Tidak	081233538694	vionita@gloriaschool.org	1985-01-04 00:00:00+07	\N
01392	CHRISTINE APRIYANI	P	2020-01-27 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Aktif	08973250945	christine_apriyani@gloriaschool.org	1997-04-27 00:00:00+07	BF  8B  13  E6
01251	WELYAM SAPUTRA, LIM	L	2018-10-17 00:00:00+07	\N	Lajang	PART TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	083849333055	\N	1988-12-24 00:00:00+07	\N
00790	LUCY FAJARNINGROEM	P	2014-08-01 00:00:00+07	\N	Menikah	HONORER	SD2	Kupang Indah	GURU	GURU	Tidak	081553839382	\N	1980-05-22 00:00:00+07	\N
00449	MARISKA MAHARANI	P	2011-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	081331427100	mariska_maharani@gloriaschool.org	1980-12-18 00:00:00+07	FF  92  17  E6
01488	WAHYU MEGA KRISTANTO	L	2021-08-02 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	085887801664	wahyu_kristanto@gloriaschool.org	1996-05-31 00:00:00+07	\N
00698	ERLITA TANIA	P	2013-08-15 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Aktif	081931071223	erlita_tania@gloriaschool.org	1990-05-12 00:00:00+07	BF  F4  0B  E6
01611	DANIEL ADI WIJAYA	L	2023-11-15 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	082142063910	daniel_wijaya@gloriaschool.org	1993-02-02 00:00:00+07	\N
01150	WAHYUDI YUNARTO	L	2017-09-01 00:00:00+07	\N	Lajang	HONORER	SMP1	Kupang Indah	GURU	GURU	Tidak	08785598228	wahyudiyunarto9@gmail.com	1995-07-17 00:00:00+07	\N
00259	TEGUH PRIYANTO	L	2008-07-01 10:03:33+07	\N	Cerai	FULL TIME	SMP2	Pakuwon City	GURU	GURU	Tidak	087852370023	\N	1982-11-28 00:00:00+07	\N
01435	MICHAEL GLEN LORENZO	L	2020-07-24 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	0895808380708	michael_lorenzo@gloriaschool.org	1997-12-13 00:00:00+07	\N
00435	SIFERAH INDAHWATI	P	2011-05-02 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Aktif	082218253735	siferah_indahwati@gloriaschool.org	1986-06-04 00:00:00+07	1F  29  18  E6
00157	NOVIAN FEBE IRMAWATI	P	2009-07-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	082139907054	\N	1981-11-17 00:00:00+07	\N
00837	PENDING NILO PRADUTO	P	2015-01-13 00:00:00+07	\N	Menikah	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	081335120474	\N	1980-07-26 08:51:15+07	\N
01147	GIOVANI KARTOSUGONDO	P	2017-08-14 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	PR DAN PSB	KARYAWAN	Tidak	0817399368	\N	1994-11-06 00:00:00+07	\N
01691	SANDRA OKTAVIA SAPUTRA	P	2025-03-03 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	KURIKULUM SMP-SMA	KARYAWAN	Tidak	081936671565	sandra_saputra@gloriaschool.org	2000-10-01 00:00:00+07	\N
00044	AGNIS NITA KRISTIYANA	P	2007-07-09 00:00:00+07	\N	Menikah	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Tidak	085730004513	\N	1983-02-14 00:00:00+07	\N
00168	SRI WAHYU UTAMI	P	2006-01-01 00:00:00+07	\N	Menikah	FULL TIME	SD3	Pakuwon City	GURU	GURU	Aktif	085103003766	sri_wahyu@gloriaschool.org	1979-12-02 00:00:00+07	9F  7E  17  E6
00682	IKE WIDOWATI	P	2013-07-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK2	Kupang Indah	GURU	GURU	Tidak	083832389300	\N	1984-05-07 00:00:00+07	\N
01499	BELINDA ANDREA LIEVIANT	P	2022-01-04 00:00:00+07	\N	Lajang	FULL TIME	SMP1	Kupang Indah	GURU	GURU	Tidak	081330836565	belinda_lieviant@gloriaschool.org	1995-01-24 00:00:00+07	\N
00155	MERLIN SANTOSO	P	2010-07-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	GURU	GURU	Tidak	\N	\N	1985-09-05 00:00:00+07	\N
01512	NATALIA MANDIRIANI	P	2022-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	082244457237	natalia_mandiriani@gloriaschool.org	1995-12-18 00:00:00+07	\N
00599	MICHELLE NATHANIA FENHAN	P	2012-10-12 00:00:00+07	\N	Lajang	HONORER	SMP1	Kupang Indah	GURU	GURU	Tidak	\N	\N	1994-06-12 00:00:00+07	\N
00233	JOVITA VICKA BAYUWARDHANI	P	2008-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA2	Pakuwon City	GURU	GURU	Tidak	\N	\N	1986-01-24 00:00:00+07	\N
00486	ARIE SANTOSO	L	2011-08-15 00:00:00+07	\N	TBA	HONORER	SMA2	Pakuwon City	GURU	GURU	Tidak	081271146600	\N	1986-04-23 00:00:00+07	\N
01410	SONIA	P	2020-07-01 00:00:00+07	\N	Lajang	FULL TIME	SMA1	Sukomanunggal	GURU	GURU	Tidak	0838560494112	sonia_bio@gloriaschool.org	1996-05-28 00:00:00+07	\N
01364	SHIRLEEN GIANINA	P	2019-08-01 00:00:00+07	\N	Lajang	FULL TIME	PGTK1	Pacar	GURU	GURU	Tidak	087852772232	shirleen_gianina@gloriaschool.org	1995-04-06 00:00:00+07	\N
01368	GERALDO PANDEGA LATUMAHINA	L	2019-08-19 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	HR	KARYAWAN	Tidak	082250622740	geraldo_pandega@gloriaschool.org	1986-02-17 00:00:00+07	\N
01598	AIDA PURNASARI	P	2023-07-24 00:00:00+07	\N	Menikah	FULL TIME	SD1	Pacar	GURU	GURU	Aktif	081330550888	aida_purnasari@gloriaschool.org	1978-01-23 00:00:00+07	5F  46  14  E6
00347	YOHANES ARJOHAN	L	2002-05-30 00:00:00+07	\N	Menikah	FULL TIME	SATPAM	Sukomanunggal	SECURITY	KARYAWAN	Aktif	085232004560	yohanes.arjohan1979@gmail.com	1979-12-28 00:00:00+07	\N
00201	MARIA SELSIANA DEVITA WULANDARI, S.E.	P	2010-11-20 00:00:00+07	\N	Menikah	-	SMP1	Kupang Indah	TATA USAHA	GURU	Tidak	\N	\N	1984-12-05 00:00:00+07	\N
01686	YEHEZKIEL WISNU ADI KRISTANTO	L	2025-01-13 00:00:00+07	\N	Lajang	FULL TIME	PGTK3	Pakuwon City	PERPUSTAKAAN	KARYAWAN	Tidak	082231275253	yehezkiel_kristanto@gloriaschool.org	2001-11-02 00:00:00+07	\N
00964	WILLIAM YAPUTRA BUDIMAN	L	2016-01-22 00:00:00+07	\N	Lajang	HONORER	SMA1	Sukomanunggal	GURU	GURU	Tidak	087853179202	w.yaputra.b@gmail.com	1993-12-11 00:00:00+07	\N
01726	ZEFANYA D.PUTRI NGGANGGUS	P	2025-07-01 00:00:00+07	\N	Lajang	FULL TIME	YAYASAN	Kupang Indah	KURIKULUM SMP-SMA	KARYAWAN	Aktif	082227683132	zefanya_ngganggus@gloriaschool.org	1999-05-18 00:00:00+07	FF  4F  16  E6
00326	LULUK	P	2001-01-13 00:00:00+07	\N	Cerai	FULL TIME	UMUM	Pacar	KANTIN	KARYAWAN	Tidak	081331656250	\N	1970-09-05 00:00:00+07	\N
00689	IKA HARI DIAH KRISTANTI	P	2013-07-18 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	TATA USAHA	KARYAWAN	Tidak	085749505895	\N	1984-09-19 00:00:00+07	\N
00459	TAN KWANG PIN	L	1899-12-30 00:00:00+07:07:12	\N	Menikah	-	SMA1	Sukomanunggal	GURU	GURU	Tidak	081220011333	\N	1974-12-17 00:00:00+07	\N
01189	TRIYANAH	P	2018-02-26 00:00:00+07	\N	Menikah	FULL TIME	SD2	Kupang Indah	GURU	GURU	Tidak	087859241137	\N	1980-02-02 00:00:00+07	\N
00900	RICHARD SAMUEL LIEJANTO	L	2015-07-01 00:00:00+07	\N	Lajang	FULL TIME	SD3	Pakuwon City	GURU	GURU	Tidak	081231072127	\N	1985-12-11 00:00:00+07	\N
01495	CHRISTIAN SETIO HANDOKO	L	2021-10-01 00:00:00+07	\N	Menikah	FULL TIME	YAYASAN	Kupang Indah	IT	KARYAWAN	Tidak	081378780778	christian_handoko@gloriaschool.org	1991-10-23 00:00:00+07	FF  09  0C  E6
\.


--
-- Data for Name: api_keys; Type: TABLE DATA; Schema: gloria_ops; Owner: postgres
--

COPY gloria_ops.api_keys (id, name, key_hash, prefix, last_four_chars, algorithm, user_id, description, permissions, rate_limit, allowed_ips, last_used_at, last_used_ip, usage_count, expires_at, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: gloria_ops; Owner: postgres
--

COPY gloria_ops.audit_logs (id, actor_id, actor_profile_id, action, module, entity_type, entity_id, entity_display, old_values, new_values, changed_fields, target_user_id, metadata, ip_address, user_agent, created_at, category) FROM stdin;
\.


--
-- Data for Name: bulk_operation_progress; Type: TABLE DATA; Schema: gloria_ops; Owner: postgres
--

COPY gloria_ops.bulk_operation_progress (id, operation_type, status, total_items, processed_items, successful_items, failed_items, error_details, rollback_data, started_at, completed_at, initiated_by, metadata) FROM stdin;
\.


--
-- Data for Name: delegations; Type: TABLE DATA; Schema: gloria_ops; Owner: postgres
--

COPY gloria_ops.delegations (id, type, delegator_id, delegate_id, reason, effective_from, effective_until, is_active, context, created_at, updated_at, created_by) FROM stdin;
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: gloria_ops; Owner: postgres
--

COPY gloria_ops.departments (id, code, name, school_id, parent_id, description, is_active, created_at, updated_at, created_by, modified_by) FROM stdin;
\.


--
-- Data for Name: feature_flag_evaluations; Type: TABLE DATA; Schema: gloria_ops; Owner: postgres
--

COPY gloria_ops.feature_flag_evaluations (id, feature_flag_id, user_id, result, reason, context, evaluated_at) FROM stdin;
\.


--
-- Data for Name: feature_flags; Type: TABLE DATA; Schema: gloria_ops; Owner: postgres
--

COPY gloria_ops.feature_flags (id, key, name, description, type, enabled, default_value, rollout_percentage, conditions, target_users, target_roles, target_schools, start_date, end_date, metadata, created_at, updated_at, created_by) FROM stdin;
\.


--
-- Data for Name: module_permissions; Type: TABLE DATA; Schema: gloria_ops; Owner: postgres
--

COPY gloria_ops.module_permissions (id, module_id, action, scope, description) FROM stdin;
\.


--
-- Data for Name: modules; Type: TABLE DATA; Schema: gloria_ops; Owner: postgres
--

COPY gloria_ops.modules (id, code, name, category, description, icon, path, parent_id, sort_order, is_active, is_visible, version, deleted_at, deleted_by, delete_reason, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: gloria_ops; Owner: postgres
--

COPY gloria_ops.permissions (id, code, name, description, resource, action, scope, conditions, metadata, is_system_permission, is_active, created_at, updated_at, created_by, category, group_icon, group_name, group_sort_order) FROM stdin;
\.


--
-- Data for Name: position_hierarchy; Type: TABLE DATA; Schema: gloria_ops; Owner: postgres
--

COPY gloria_ops.position_hierarchy (id, position_id, reports_to_id, coordinator_id) FROM stdin;
\.


--
-- Data for Name: positions; Type: TABLE DATA; Schema: gloria_ops; Owner: postgres
--

COPY gloria_ops.positions (id, code, name, department_id, school_id, hierarchy_level, max_holders, is_unique, is_active, created_at, updated_at, created_by, modified_by) FROM stdin;
\.


--
-- Data for Name: role_hierarchy; Type: TABLE DATA; Schema: gloria_ops; Owner: postgres
--

COPY gloria_ops.role_hierarchy (id, role_id, parent_role_id, inherit_permissions, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: role_module_access; Type: TABLE DATA; Schema: gloria_ops; Owner: postgres
--

COPY gloria_ops.role_module_access (id, role_id, module_id, position_id, permissions, is_active, created_at, updated_at, created_by, version) FROM stdin;
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: gloria_ops; Owner: postgres
--

COPY gloria_ops.role_permissions (id, role_id, permission_id, is_granted, conditions, granted_by, grant_reason, created_at, updated_at, effective_from, effective_until) FROM stdin;
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: gloria_ops; Owner: postgres
--

COPY gloria_ops.roles (id, code, name, description, hierarchy_level, is_system_role, is_active, created_at, updated_at, created_by) FROM stdin;
\.


--
-- Data for Name: schools; Type: TABLE DATA; Schema: gloria_ops; Owner: postgres
--

COPY gloria_ops.schools (id, code, name, lokasi, address, phone, email, principal, is_active, created_at, updated_at, created_by, modified_by) FROM stdin;
\.


--
-- Data for Name: system_configurations; Type: TABLE DATA; Schema: gloria_ops; Owner: postgres
--

COPY gloria_ops.system_configurations (id, key, value, type, category, description, is_encrypted, is_public, metadata, validation_rules, created_at, updated_at, updated_by) FROM stdin;
\.


--
-- Data for Name: user_module_access; Type: TABLE DATA; Schema: gloria_ops; Owner: postgres
--

COPY gloria_ops.user_module_access (id, user_profile_id, module_id, permissions, granted_by, reason, is_active, created_at, updated_at, version, effective_from, effective_until) FROM stdin;
\.


--
-- Data for Name: user_permissions; Type: TABLE DATA; Schema: gloria_ops; Owner: postgres
--

COPY gloria_ops.user_permissions (id, user_profile_id, permission_id, is_granted, conditions, granted_by, grant_reason, priority, is_temporary, created_at, updated_at, resource_id, resource_type, effective_from, effective_until) FROM stdin;
\.


--
-- Data for Name: user_positions; Type: TABLE DATA; Schema: gloria_ops; Owner: postgres
--

COPY gloria_ops.user_positions (id, user_profile_id, position_id, start_date, end_date, is_active, is_plt, appointed_by, sk_number, notes, permission_scope, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: gloria_ops; Owner: postgres
--

COPY gloria_ops.user_profiles (id, clerk_user_id, nip, is_active, last_active, preferences, created_at, updated_at, created_by) FROM stdin;
60f70a41-f7f3-4f07-b457-9f42f9e7a2e8	user_31HVaizFgna3kjsZig9Wnflbqpp	01495	t	\N	\N	2025-12-11 21:27:39.305789+07	2025-12-11 21:27:39.305789+07	\N
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: gloria_ops; Owner: postgres
--

COPY gloria_ops.user_roles (id, user_profile_id, role_id, assigned_at, assigned_by, is_active, effective_from, effective_until) FROM stdin;
\.


--
-- Data for Name: workflow; Type: TABLE DATA; Schema: gloria_ops; Owner: postgres
--

COPY gloria_ops.workflow (id, request_id, workflow_type, status, initiator_id, temporal_workflow_id, temporal_run_id, metadata, started_at, completed_at, created_at) FROM stdin;
\.


--
-- Name: data_karyawan data_karyawan_pkey; Type: CONSTRAINT; Schema: gloria_master; Owner: postgres
--

ALTER TABLE ONLY gloria_master.data_karyawan
    ADD CONSTRAINT data_karyawan_pkey PRIMARY KEY (nip);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: gloria_ops; Owner: postgres
--

ALTER TABLE ONLY gloria_ops.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: gloria_ops; Owner: postgres
--

ALTER TABLE ONLY gloria_ops.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: bulk_operation_progress bulk_operation_progress_pkey; Type: CONSTRAINT; Schema: gloria_ops; Owner: postgres
--

ALTER TABLE ONLY gloria_ops.bulk_operation_progress
    ADD CONSTRAINT bulk_operation_progress_pkey PRIMARY KEY (id);


--
-- Name: delegations delegations_pkey; Type: CONSTRAINT; Schema: gloria_ops; Owner: postgres
--

ALTER TABLE ONLY gloria_ops.delegations
    ADD CONSTRAINT delegations_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: gloria_ops; Owner: postgres
--

ALTER TABLE ONLY gloria_ops.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: feature_flag_evaluations feature_flag_evaluations_pkey; Type: CONSTRAINT; Schema: gloria_ops; Owner: postgres
--

ALTER TABLE ONLY gloria_ops.feature_flag_evaluations
    ADD CONSTRAINT feature_flag_evaluations_pkey PRIMARY KEY (id);


--
-- Name: feature_flags feature_flags_pkey; Type: CONSTRAINT; Schema: gloria_ops; Owner: postgres
--

ALTER TABLE ONLY gloria_ops.feature_flags
    ADD CONSTRAINT feature_flags_pkey PRIMARY KEY (id);


--
-- Name: module_permissions module_permissions_pkey; Type: CONSTRAINT; Schema: gloria_ops; Owner: postgres
--

ALTER TABLE ONLY gloria_ops.module_permissions
    ADD CONSTRAINT module_permissions_pkey PRIMARY KEY (id);


--
-- Name: modules modules_pkey; Type: CONSTRAINT; Schema: gloria_ops; Owner: postgres
--

ALTER TABLE ONLY gloria_ops.modules
    ADD CONSTRAINT modules_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: gloria_ops; Owner: postgres
--

ALTER TABLE ONLY gloria_ops.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: position_hierarchy position_hierarchy_pkey; Type: CONSTRAINT; Schema: gloria_ops; Owner: postgres
--

ALTER TABLE ONLY gloria_ops.position_hierarchy
    ADD CONSTRAINT position_hierarchy_pkey PRIMARY KEY (id);


--
-- Name: positions positions_pkey; Type: CONSTRAINT; Schema: gloria_ops; Owner: postgres
--

ALTER TABLE ONLY gloria_ops.positions
    ADD CONSTRAINT positions_pkey PRIMARY KEY (id);


--
-- Name: role_hierarchy role_hierarchy_pkey; Type: CONSTRAINT; Schema: gloria_ops; Owner: postgres
--

ALTER TABLE ONLY gloria_ops.role_hierarchy
    ADD CONSTRAINT role_hierarchy_pkey PRIMARY KEY (id);


--
-- Name: role_module_access role_module_access_pkey; Type: CONSTRAINT; Schema: gloria_ops; Owner: postgres
--

ALTER TABLE ONLY gloria_ops.role_module_access
    ADD CONSTRAINT role_module_access_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: gloria_ops; Owner: postgres
--

ALTER TABLE ONLY gloria_ops.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: gloria_ops; Owner: postgres
--

ALTER TABLE ONLY gloria_ops.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: schools schools_pkey; Type: CONSTRAINT; Schema: gloria_ops; Owner: postgres
--

ALTER TABLE ONLY gloria_ops.schools
    ADD CONSTRAINT schools_pkey PRIMARY KEY (id);


--
-- Name: system_configurations system_configurations_pkey; Type: CONSTRAINT; Schema: gloria_ops; Owner: postgres
--

ALTER TABLE ONLY gloria_ops.system_configurations
    ADD CONSTRAINT system_configurations_pkey PRIMARY KEY (id);


--
-- Name: module_permissions uq_module_permissions_module_action_scope; Type: CONSTRAINT; Schema: gloria_ops; Owner: postgres
--

ALTER TABLE ONLY gloria_ops.module_permissions
    ADD CONSTRAINT uq_module_permissions_module_action_scope UNIQUE (module_id, action, scope);


--
-- Name: permissions uq_permissions_resource_action_scope; Type: CONSTRAINT; Schema: gloria_ops; Owner: postgres
--

ALTER TABLE ONLY gloria_ops.permissions
    ADD CONSTRAINT uq_permissions_resource_action_scope UNIQUE (resource, action, scope);


--
-- Name: role_hierarchy uq_role_hierarchy_role_parent; Type: CONSTRAINT; Schema: gloria_ops; Owner: postgres
--

ALTER TABLE ONLY gloria_ops.role_hierarchy
    ADD CONSTRAINT uq_role_hierarchy_role_parent UNIQUE (role_id, parent_role_id);


--
-- Name: role_module_access uq_role_module_access_role_module; Type: CONSTRAINT; Schema: gloria_ops; Owner: postgres
--

ALTER TABLE ONLY gloria_ops.role_module_access
    ADD CONSTRAINT uq_role_module_access_role_module UNIQUE (role_id, module_id);


--
-- Name: role_permissions uq_role_permissions_role_permission; Type: CONSTRAINT; Schema: gloria_ops; Owner: postgres
--

ALTER TABLE ONLY gloria_ops.role_permissions
    ADD CONSTRAINT uq_role_permissions_role_permission UNIQUE (role_id, permission_id);


--
-- Name: user_permissions uq_user_permissions_user_permission_resource; Type: CONSTRAINT; Schema: gloria_ops; Owner: postgres
--

ALTER TABLE ONLY gloria_ops.user_permissions
    ADD CONSTRAINT uq_user_permissions_user_permission_resource UNIQUE (user_profile_id, permission_id, resource_type, resource_id);


--
-- Name: user_positions uq_user_positions_user_position_start; Type: CONSTRAINT; Schema: gloria_ops; Owner: postgres
--

ALTER TABLE ONLY gloria_ops.user_positions
    ADD CONSTRAINT uq_user_positions_user_position_start UNIQUE (user_profile_id, position_id, start_date);


--
-- Name: user_roles uq_user_roles_user_role; Type: CONSTRAINT; Schema: gloria_ops; Owner: postgres
--

ALTER TABLE ONLY gloria_ops.user_roles
    ADD CONSTRAINT uq_user_roles_user_role UNIQUE (user_profile_id, role_id);


--
-- Name: user_module_access user_module_access_pkey; Type: CONSTRAINT; Schema: gloria_ops; Owner: postgres
--

ALTER TABLE ONLY gloria_ops.user_module_access
    ADD CONSTRAINT user_module_access_pkey PRIMARY KEY (id);


--
-- Name: user_permissions user_permissions_pkey; Type: CONSTRAINT; Schema: gloria_ops; Owner: postgres
--

ALTER TABLE ONLY gloria_ops.user_permissions
    ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (id);


--
-- Name: user_positions user_positions_pkey; Type: CONSTRAINT; Schema: gloria_ops; Owner: postgres
--

ALTER TABLE ONLY gloria_ops.user_positions
    ADD CONSTRAINT user_positions_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: gloria_ops; Owner: postgres
--

ALTER TABLE ONLY gloria_ops.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: gloria_ops; Owner: postgres
--

ALTER TABLE ONLY gloria_ops.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: workflow workflow_pkey; Type: CONSTRAINT; Schema: gloria_ops; Owner: postgres
--

ALTER TABLE ONLY gloria_ops.workflow
    ADD CONSTRAINT workflow_pkey PRIMARY KEY (id);


--
-- Name: idx_data_karyawan_nip; Type: INDEX; Schema: gloria_master; Owner: postgres
--

CREATE INDEX idx_data_karyawan_nip ON gloria_master.data_karyawan USING btree (nip);


--
-- Name: idx_gloria_master_data_karyawan_bagian_kerja; Type: INDEX; Schema: gloria_master; Owner: postgres
--

CREATE INDEX idx_gloria_master_data_karyawan_bagian_kerja ON gloria_master.data_karyawan USING btree (bagian_kerja);


--
-- Name: idx_gloria_master_data_karyawan_bidang_kerja; Type: INDEX; Schema: gloria_master; Owner: postgres
--

CREATE INDEX idx_gloria_master_data_karyawan_bidang_kerja ON gloria_master.data_karyawan USING btree (bidang_kerja);


--
-- Name: idx_gloria_master_data_karyawan_email; Type: INDEX; Schema: gloria_master; Owner: postgres
--

CREATE INDEX idx_gloria_master_data_karyawan_email ON gloria_master.data_karyawan USING btree (email);


--
-- Name: idx_api_keys_active_expires; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_api_keys_active_expires ON gloria_ops.api_keys USING btree (is_active, expires_at);


--
-- Name: idx_audit_logs_actor_module_action_created; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_audit_logs_actor_module_action_created ON gloria_ops.audit_logs USING btree (actor_profile_id, module, action, created_at DESC);


--
-- Name: idx_audit_logs_category_entity_created; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_audit_logs_category_entity_created ON gloria_ops.audit_logs USING btree (category, entity_type, created_at DESC);


--
-- Name: idx_audit_logs_created_at_desc; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_audit_logs_created_at_desc ON gloria_ops.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_entity_type_id_created; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_audit_logs_entity_type_id_created ON gloria_ops.audit_logs USING btree (entity_type, entity_id, created_at DESC);


--
-- Name: idx_bulk_operation_progress_initiated_started; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_bulk_operation_progress_initiated_started ON gloria_ops.bulk_operation_progress USING btree (initiated_by, started_at);


--
-- Name: idx_bulk_operation_progress_status_started; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_bulk_operation_progress_status_started ON gloria_ops.bulk_operation_progress USING btree (status, started_at);


--
-- Name: idx_delegations_delegate_type_active; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_delegations_delegate_type_active ON gloria_ops.delegations USING btree (delegate_id, type, is_active);


--
-- Name: idx_delegations_delegator_type_active; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_delegations_delegator_type_active ON gloria_ops.delegations USING btree (delegator_id, type, is_active);


--
-- Name: idx_delegations_type_effective; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_delegations_type_effective ON gloria_ops.delegations USING btree (type, effective_from, effective_until);


--
-- Name: idx_departments_school_active; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_departments_school_active ON gloria_ops.departments USING btree (school_id, is_active);


--
-- Name: idx_gloria_ops_api_keys_key_hash; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE UNIQUE INDEX idx_gloria_ops_api_keys_key_hash ON gloria_ops.api_keys USING btree (key_hash);


--
-- Name: idx_gloria_ops_api_keys_prefix; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_api_keys_prefix ON gloria_ops.api_keys USING btree (prefix);


--
-- Name: idx_gloria_ops_api_keys_user_id; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_api_keys_user_id ON gloria_ops.api_keys USING btree (user_id);


--
-- Name: idx_gloria_ops_bulk_operation_progress_status; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_bulk_operation_progress_status ON gloria_ops.bulk_operation_progress USING btree (status);


--
-- Name: idx_gloria_ops_departments_code; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE UNIQUE INDEX idx_gloria_ops_departments_code ON gloria_ops.departments USING btree (code);


--
-- Name: idx_gloria_ops_departments_created_by; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_departments_created_by ON gloria_ops.departments USING btree (created_by);


--
-- Name: idx_gloria_ops_departments_parent_id; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_departments_parent_id ON gloria_ops.departments USING btree (parent_id);


--
-- Name: idx_gloria_ops_departments_school_id; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_departments_school_id ON gloria_ops.departments USING btree (school_id);


--
-- Name: idx_gloria_ops_feature_flag_evaluations_evaluated_at; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_feature_flag_evaluations_evaluated_at ON gloria_ops.feature_flag_evaluations USING btree (evaluated_at);


--
-- Name: idx_gloria_ops_feature_flag_evaluations_feature_flag_id; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_feature_flag_evaluations_feature_flag_id ON gloria_ops.feature_flag_evaluations USING btree (feature_flag_id);


--
-- Name: idx_gloria_ops_feature_flag_evaluations_user_id; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_feature_flag_evaluations_user_id ON gloria_ops.feature_flag_evaluations USING btree (user_id);


--
-- Name: idx_gloria_ops_feature_flags_enabled; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_feature_flags_enabled ON gloria_ops.feature_flags USING btree (enabled);


--
-- Name: idx_gloria_ops_feature_flags_key; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE UNIQUE INDEX idx_gloria_ops_feature_flags_key ON gloria_ops.feature_flags USING btree (key);


--
-- Name: idx_gloria_ops_feature_flags_type; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_feature_flags_type ON gloria_ops.feature_flags USING btree (type);


--
-- Name: idx_gloria_ops_modules_category; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_modules_category ON gloria_ops.modules USING btree (category);


--
-- Name: idx_gloria_ops_modules_code; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE UNIQUE INDEX idx_gloria_ops_modules_code ON gloria_ops.modules USING btree (code);


--
-- Name: idx_gloria_ops_modules_deleted_at; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_modules_deleted_at ON gloria_ops.modules USING btree (deleted_at);


--
-- Name: idx_gloria_ops_modules_is_active; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_modules_is_active ON gloria_ops.modules USING btree (is_active);


--
-- Name: idx_gloria_ops_permissions_action; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_permissions_action ON gloria_ops.permissions USING btree (action);


--
-- Name: idx_gloria_ops_permissions_code; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE UNIQUE INDEX idx_gloria_ops_permissions_code ON gloria_ops.permissions USING btree (code);


--
-- Name: idx_gloria_ops_permissions_resource; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_permissions_resource ON gloria_ops.permissions USING btree (resource);


--
-- Name: idx_gloria_ops_position_hierarchy_coordinator_id; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_position_hierarchy_coordinator_id ON gloria_ops.position_hierarchy USING btree (coordinator_id);


--
-- Name: idx_gloria_ops_position_hierarchy_position_id; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE UNIQUE INDEX idx_gloria_ops_position_hierarchy_position_id ON gloria_ops.position_hierarchy USING btree (position_id);


--
-- Name: idx_gloria_ops_position_hierarchy_reports_to_id; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_position_hierarchy_reports_to_id ON gloria_ops.position_hierarchy USING btree (reports_to_id);


--
-- Name: idx_gloria_ops_positions_code; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE UNIQUE INDEX idx_gloria_ops_positions_code ON gloria_ops.positions USING btree (code);


--
-- Name: idx_gloria_ops_role_hierarchy_parent_role_id; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_role_hierarchy_parent_role_id ON gloria_ops.role_hierarchy USING btree (parent_role_id);


--
-- Name: idx_gloria_ops_role_module_access_is_active; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_role_module_access_is_active ON gloria_ops.role_module_access USING btree (is_active);


--
-- Name: idx_gloria_ops_role_module_access_module_id; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_role_module_access_module_id ON gloria_ops.role_module_access USING btree (module_id);


--
-- Name: idx_gloria_ops_role_module_access_role_id; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_role_module_access_role_id ON gloria_ops.role_module_access USING btree (role_id);


--
-- Name: idx_gloria_ops_role_permissions_permission_id; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_role_permissions_permission_id ON gloria_ops.role_permissions USING btree (permission_id);


--
-- Name: idx_gloria_ops_role_permissions_role_id; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_role_permissions_role_id ON gloria_ops.role_permissions USING btree (role_id);


--
-- Name: idx_gloria_ops_roles_code; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE UNIQUE INDEX idx_gloria_ops_roles_code ON gloria_ops.roles USING btree (code);


--
-- Name: idx_gloria_ops_roles_hierarchy_level; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_roles_hierarchy_level ON gloria_ops.roles USING btree (hierarchy_level);


--
-- Name: idx_gloria_ops_schools_code; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE UNIQUE INDEX idx_gloria_ops_schools_code ON gloria_ops.schools USING btree (code);


--
-- Name: idx_gloria_ops_system_configurations_category; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_system_configurations_category ON gloria_ops.system_configurations USING btree (category);


--
-- Name: idx_gloria_ops_system_configurations_is_public; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_system_configurations_is_public ON gloria_ops.system_configurations USING btree (is_public);


--
-- Name: idx_gloria_ops_system_configurations_key; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE UNIQUE INDEX idx_gloria_ops_system_configurations_key ON gloria_ops.system_configurations USING btree (key);


--
-- Name: idx_gloria_ops_user_module_access_is_active; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_user_module_access_is_active ON gloria_ops.user_module_access USING btree (is_active);


--
-- Name: idx_gloria_ops_user_permissions_permission_id; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_user_permissions_permission_id ON gloria_ops.user_permissions USING btree (permission_id);


--
-- Name: idx_gloria_ops_user_permissions_user_profile_id; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_user_permissions_user_profile_id ON gloria_ops.user_permissions USING btree (user_profile_id);


--
-- Name: idx_gloria_ops_user_profiles_clerk_user_id; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE UNIQUE INDEX idx_gloria_ops_user_profiles_clerk_user_id ON gloria_ops.user_profiles USING btree (clerk_user_id);


--
-- Name: idx_gloria_ops_user_profiles_n_ip; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE UNIQUE INDEX idx_gloria_ops_user_profiles_n_ip ON gloria_ops.user_profiles USING btree (nip);


--
-- Name: idx_gloria_ops_user_roles_role_id; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_user_roles_role_id ON gloria_ops.user_roles USING btree (role_id);


--
-- Name: idx_gloria_ops_user_roles_user_profile_id; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_user_roles_user_profile_id ON gloria_ops.user_roles USING btree (user_profile_id);


--
-- Name: idx_gloria_ops_workflow_initiator_id; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_workflow_initiator_id ON gloria_ops.workflow USING btree (initiator_id);


--
-- Name: idx_gloria_ops_workflow_request_id; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE UNIQUE INDEX idx_gloria_ops_workflow_request_id ON gloria_ops.workflow USING btree (request_id);


--
-- Name: idx_gloria_ops_workflow_status; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_workflow_status ON gloria_ops.workflow USING btree (status);


--
-- Name: idx_gloria_ops_workflow_temporal_workflow_id; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_workflow_temporal_workflow_id ON gloria_ops.workflow USING btree (temporal_workflow_id);


--
-- Name: idx_gloria_ops_workflow_workflow_type; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_gloria_ops_workflow_workflow_type ON gloria_ops.workflow USING btree (workflow_type);


--
-- Name: idx_modules_category_active; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_modules_category_active ON gloria_ops.modules USING btree (category, is_active);


--
-- Name: idx_modules_id_version; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_modules_id_version ON gloria_ops.modules USING btree (id, version);


--
-- Name: idx_modules_parent_active_sort; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_modules_parent_active_sort ON gloria_ops.modules USING btree (parent_id, is_active, sort_order);


--
-- Name: idx_modules_visible_active; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_modules_visible_active ON gloria_ops.modules USING btree (is_visible, is_active);


--
-- Name: idx_permissions_category_active; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_permissions_category_active ON gloria_ops.permissions USING btree (category, is_active);


--
-- Name: idx_permissions_resource_action; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_permissions_resource_action ON gloria_ops.permissions USING btree (resource, action);


--
-- Name: idx_positions_dept_hierarchy_active; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_positions_dept_hierarchy_active ON gloria_ops.positions USING btree (department_id, hierarchy_level, is_active);


--
-- Name: idx_positions_school_dept_hierarchy_active; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_positions_school_dept_hierarchy_active ON gloria_ops.positions USING btree (school_id, department_id, hierarchy_level, is_active);


--
-- Name: idx_role_module_access_id_version; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_role_module_access_id_version ON gloria_ops.role_module_access USING btree (id, version);


--
-- Name: idx_role_permissions_role_granted; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_role_permissions_role_granted ON gloria_ops.role_permissions USING btree (role_id, is_granted);


--
-- Name: idx_schools_lokasi_active; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_schools_lokasi_active ON gloria_ops.schools USING btree (lokasi, is_active);


--
-- Name: idx_user_module_access_id_version; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_user_module_access_id_version ON gloria_ops.user_module_access USING btree (id, version);


--
-- Name: idx_user_module_access_user_module_active; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_user_module_access_user_module_active ON gloria_ops.user_module_access USING btree (user_profile_id, module_id, is_active);


--
-- Name: idx_user_permissions_effective_dates; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_user_permissions_effective_dates ON gloria_ops.user_permissions USING btree (effective_from, effective_until);


--
-- Name: idx_user_permissions_resource; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_user_permissions_resource ON gloria_ops.user_permissions USING btree (resource_type, resource_id);


--
-- Name: idx_user_permissions_user_granted; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_user_permissions_user_granted ON gloria_ops.user_permissions USING btree (user_profile_id, is_granted);


--
-- Name: idx_user_positions_position_active_dates; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_user_positions_position_active_dates ON gloria_ops.user_positions USING btree (position_id, is_active, start_date, end_date);


--
-- Name: idx_user_positions_user_active_dates; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_user_positions_user_active_dates ON gloria_ops.user_positions USING btree (user_profile_id, is_active, start_date, end_date);


--
-- Name: idx_user_profiles_clerk_active; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_user_profiles_clerk_active ON gloria_ops.user_profiles USING btree (clerk_user_id, is_active);


--
-- Name: idx_user_profiles_nip_active; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_user_profiles_nip_active ON gloria_ops.user_profiles USING btree (nip, is_active);


--
-- Name: idx_workflow_started_at_desc; Type: INDEX; Schema: gloria_ops; Owner: postgres
--

CREATE INDEX idx_workflow_started_at_desc ON gloria_ops.workflow USING btree (started_at DESC);


--
-- Name: user_profiles fk_user_profiles_data_karyawan_nip; Type: FK CONSTRAINT; Schema: gloria_ops; Owner: postgres
--

ALTER TABLE ONLY gloria_ops.user_profiles
    ADD CONSTRAINT fk_user_profiles_data_karyawan_nip FOREIGN KEY (nip) REFERENCES gloria_master.data_karyawan(nip) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

