// To parse this data:
//
//   import { Convert, Image } from "./file";
//
//   const image = Convert.toImage(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export interface Image {
    total:       number;
    total_pages: number;
    results:     Result[];
}

export interface Result {
    id:                       string;
    slug:                     string;
    alternative_slugs:        AlternativeSlugs;
    created_at:               Date;
    updated_at:               Date;
    promoted_at:              Date | null;
    width:                    number;
    height:                   number;
    color:                    string;
    blur_hash:                string;
    description:              null | string;
    alt_description:          string;
    breadcrumbs:              Breadcrumb[];
    urls:                     Urls;
    links:                    ResultLinks;
    likes:                    number;
    liked_by_user:            boolean;
    current_user_collections: any[];
    sponsorship:              null;
    topic_submissions:        TopicSubmissions;
    asset_type:               AssetType;
    user:                     User;
}

export interface AlternativeSlugs {
    en: string;
    es: string;
    ja: string;
    fr: string;
    it: string;
    ko: string;
    de: string;
    pt: string;
}

export enum AssetType {
    Photo = "photo",
}

export interface Breadcrumb {
    slug:  string;
    title: string;
    index: number;
    type:  string;
}

export interface ResultLinks {
    self:              string;
    html:              string;
    download:          string;
    download_location: string;
}

export interface TopicSubmissions {
    nature?:              CurrentEvents;
    travel?:              Travel;
    wallpapers?:          CurrentEvents;
    "textures-patterns"?: CurrentEvents;
    health?:              CurrentEvents;
    "current-events"?:    CurrentEvents;
}

export interface CurrentEvents {
    status: string;
}

export interface Travel {
    status:       string;
    approved_on?: Date;
}

export interface Urls {
    raw:      string;
    full:     string;
    regular:  string;
    small:    string;
    thumb:    string;
    small_s3: string;
}

export interface User {
    id:                           string;
    updated_at:                   Date;
    username:                     string;
    name:                         string;
    first_name:                   string;
    last_name:                    string;
    twitter_username:             null | string;
    portfolio_url:                null | string;
    bio:                          string;
    location:                     null | string;
    links:                        UserLinks;
    profile_image:                ProfileImage;
    instagram_username:           null | string;
    total_collections:            number;
    total_likes:                  number;
    total_photos:                 number;
    total_promoted_photos:        number;
    total_illustrations:          number;
    total_promoted_illustrations: number;
    accepted_tos:                 boolean;
    for_hire:                     boolean;
    social:                       Social;
}

export interface UserLinks {
    self:      string;
    html:      string;
    photos:    string;
    likes:     string;
    portfolio: string;
    following: string;
    followers: string;
}

export interface ProfileImage {
    small:  string;
    medium: string;
    large:  string;
}

export interface Social {
    instagram_username: null | string;
    portfolio_url:      null | string;
    twitter_username:   null | string;
    paypal_email:       null;
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
    public static toImage(json: string): Image {
        return cast(JSON.parse(json), r("Image"));
    }

    public static imageToJson(value: Image): string {
        return JSON.stringify(uncast(value, r("Image")), null, 2);
    }
}

function invalidValue(typ: any, val: any, key: any, parent: any = ''): never {
    const prettyTyp = prettyTypeName(typ);
    const parentText = parent ? ` on ${parent}` : '';
    const keyText = key ? ` for key "${key}"` : '';
    throw Error(`Invalid value${keyText}${parentText}. Expected ${prettyTyp} but got ${JSON.stringify(val)}`);
}

function prettyTypeName(typ: any): string {
    if (Array.isArray(typ)) {
        if (typ.length === 2 && typ[0] === undefined) {
            return `an optional ${prettyTypeName(typ[1])}`;
        } else {
            return `one of [${typ.map(a => { return prettyTypeName(a); }).join(", ")}]`;
        }
    } else if (typeof typ === "object" && typ.literal !== undefined) {
        return typ.literal;
    } else {
        return typeof typ;
    }
}

function jsonToJSProps(typ: any): any {
    if (typ.jsonToJS === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.json] = { key: p.js, typ: p.typ });
        typ.jsonToJS = map;
    }
    return typ.jsonToJS;
}

function jsToJSONProps(typ: any): any {
    if (typ.jsToJSON === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.js] = { key: p.json, typ: p.typ });
        typ.jsToJSON = map;
    }
    return typ.jsToJSON;
}

function transform(val: any, typ: any, getProps: any, key: any = '', parent: any = ''): any {
    function transformPrimitive(typ: string, val: any): any {
        if (typeof typ === typeof val) return val;
        return invalidValue(typ, val, key, parent);
    }

    function transformUnion(typs: any[], val: any): any {
        // val must validate against one typ in typs
        const l = typs.length;
        for (let i = 0; i < l; i++) {
            const typ = typs[i];
            try {
                return transform(val, typ, getProps);
            } catch (_) {}
        }
        return invalidValue(typs, val, key, parent);
    }

    function transformEnum(cases: string[], val: any): any {
        if (cases.indexOf(val) !== -1) return val;
        return invalidValue(cases.map(a => { return l(a); }), val, key, parent);
    }

    function transformArray(typ: any, val: any): any {
        // val must be an array with no invalid elements
        if (!Array.isArray(val)) return invalidValue(l("array"), val, key, parent);
        return val.map(el => transform(el, typ, getProps));
    }

    function transformDate(val: any): any {
        if (val === null) {
            return null;
        }
        const d = new Date(val);
        if (isNaN(d.valueOf())) {
            return invalidValue(l("Date"), val, key, parent);
        }
        return d;
    }

    function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
        if (val === null || typeof val !== "object" || Array.isArray(val)) {
            return invalidValue(l(ref || "object"), val, key, parent);
        }
        const result: any = {};
        Object.getOwnPropertyNames(props).forEach(key => {
            const prop = props[key];
            const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
            result[prop.key] = transform(v, prop.typ, getProps, key, ref);
        });
        Object.getOwnPropertyNames(val).forEach(key => {
            if (!Object.prototype.hasOwnProperty.call(props, key)) {
                result[key] = transform(val[key], additional, getProps, key, ref);
            }
        });
        return result;
    }

    if (typ === "any") return val;
    if (typ === null) {
        if (val === null) return val;
        return invalidValue(typ, val, key, parent);
    }
    if (typ === false) return invalidValue(typ, val, key, parent);
    let ref: any = undefined;
    while (typeof typ === "object" && typ.ref !== undefined) {
        ref = typ.ref;
        typ = typeMap[typ.ref];
    }
    if (Array.isArray(typ)) return transformEnum(typ, val);
    if (typeof typ === "object") {
        return typ.hasOwnProperty("unionMembers") ? transformUnion(typ.unionMembers, val)
            : typ.hasOwnProperty("arrayItems")    ? transformArray(typ.arrayItems, val)
            : typ.hasOwnProperty("props")         ? transformObject(getProps(typ), typ.additional, val)
            : invalidValue(typ, val, key, parent);
    }
    // Numbers can be parsed by Date but shouldn't be.
    if (typ === Date && typeof val !== "number") return transformDate(val);
    return transformPrimitive(typ, val);
}

function cast<T>(val: any, typ: any): T {
    return transform(val, typ, jsonToJSProps);
}

function uncast<T>(val: T, typ: any): any {
    return transform(val, typ, jsToJSONProps);
}

function l(typ: any) {
    return { literal: typ };
}

function a(typ: any) {
    return { arrayItems: typ };
}

function u(...typs: any[]) {
    return { unionMembers: typs };
}

function o(props: any[], additional: any) {
    return { props, additional };
}

// function m(additional: any) {
//     return { props: [], additional };
// }

function r(name: string) {
    return { ref: name };
}

const typeMap: any = {
    "Image": o([
        { json: "total", js: "total", typ: 0 },
        { json: "total_pages", js: "total_pages", typ: 0 },
        { json: "results", js: "results", typ: a(r("Result")) },
    ], false),
    "Result": o([
        { json: "id", js: "id", typ: "" },
        { json: "slug", js: "slug", typ: "" },
        { json: "alternative_slugs", js: "alternative_slugs", typ: r("AlternativeSlugs") },
        { json: "created_at", js: "created_at", typ: Date },
        { json: "updated_at", js: "updated_at", typ: Date },
        { json: "promoted_at", js: "promoted_at", typ: u(Date, null) },
        { json: "width", js: "width", typ: 0 },
        { json: "height", js: "height", typ: 0 },
        { json: "color", js: "color", typ: "" },
        { json: "blur_hash", js: "blur_hash", typ: "" },
        { json: "description", js: "description", typ: u(null, "") },
        { json: "alt_description", js: "alt_description", typ: "" },
        { json: "breadcrumbs", js: "breadcrumbs", typ: a(r("Breadcrumb")) },
        { json: "urls", js: "urls", typ: r("Urls") },
        { json: "links", js: "links", typ: r("ResultLinks") },
        { json: "likes", js: "likes", typ: 0 },
        { json: "liked_by_user", js: "liked_by_user", typ: true },
        { json: "current_user_collections", js: "current_user_collections", typ: a("any") },
        { json: "sponsorship", js: "sponsorship", typ: null },
        { json: "topic_submissions", js: "topic_submissions", typ: r("TopicSubmissions") },
        { json: "asset_type", js: "asset_type", typ: r("AssetType") },
        { json: "user", js: "user", typ: r("User") },
    ], false),
    "AlternativeSlugs": o([
        { json: "en", js: "en", typ: "" },
        { json: "es", js: "es", typ: "" },
        { json: "ja", js: "ja", typ: "" },
        { json: "fr", js: "fr", typ: "" },
        { json: "it", js: "it", typ: "" },
        { json: "ko", js: "ko", typ: "" },
        { json: "de", js: "de", typ: "" },
        { json: "pt", js: "pt", typ: "" },
    ], false),
    "Breadcrumb": o([
        { json: "slug", js: "slug", typ: "" },
        { json: "title", js: "title", typ: "" },
        { json: "index", js: "index", typ: 0 },
        { json: "type", js: "type", typ: "" },
    ], false),
    "ResultLinks": o([
        { json: "self", js: "self", typ: "" },
        { json: "html", js: "html", typ: "" },
        { json: "download", js: "download", typ: "" },
        { json: "download_location", js: "download_location", typ: "" },
    ], false),
    "TopicSubmissions": o([
        { json: "nature", js: "nature", typ: u(undefined, r("CurrentEvents")) },
        { json: "travel", js: "travel", typ: u(undefined, r("Travel")) },
        { json: "wallpapers", js: "wallpapers", typ: u(undefined, r("CurrentEvents")) },
        { json: "textures-patterns", js: "textures-patterns", typ: u(undefined, r("CurrentEvents")) },
        { json: "health", js: "health", typ: u(undefined, r("CurrentEvents")) },
        { json: "current-events", js: "current-events", typ: u(undefined, r("CurrentEvents")) },
    ], false),
    "CurrentEvents": o([
        { json: "status", js: "status", typ: "" },
    ], false),
    "Travel": o([
        { json: "status", js: "status", typ: "" },
        { json: "approved_on", js: "approved_on", typ: u(undefined, Date) },
    ], false),
    "Urls": o([
        { json: "raw", js: "raw", typ: "" },
        { json: "full", js: "full", typ: "" },
        { json: "regular", js: "regular", typ: "" },
        { json: "small", js: "small", typ: "" },
        { json: "thumb", js: "thumb", typ: "" },
        { json: "small_s3", js: "small_s3", typ: "" },
    ], false),
    "User": o([
        { json: "id", js: "id", typ: "" },
        { json: "updated_at", js: "updated_at", typ: Date },
        { json: "username", js: "username", typ: "" },
        { json: "name", js: "name", typ: "" },
        { json: "first_name", js: "first_name", typ: "" },
        { json: "last_name", js: "last_name", typ: "" },
        { json: "twitter_username", js: "twitter_username", typ: u(null, "") },
        { json: "portfolio_url", js: "portfolio_url", typ: u(null, "") },
        { json: "bio", js: "bio", typ: "" },
        { json: "location", js: "location", typ: u(null, "") },
        { json: "links", js: "links", typ: r("UserLinks") },
        { json: "profile_image", js: "profile_image", typ: r("ProfileImage") },
        { json: "instagram_username", js: "instagram_username", typ: u(null, "") },
        { json: "total_collections", js: "total_collections", typ: 0 },
        { json: "total_likes", js: "total_likes", typ: 0 },
        { json: "total_photos", js: "total_photos", typ: 0 },
        { json: "total_promoted_photos", js: "total_promoted_photos", typ: 0 },
        { json: "total_illustrations", js: "total_illustrations", typ: 0 },
        { json: "total_promoted_illustrations", js: "total_promoted_illustrations", typ: 0 },
        { json: "accepted_tos", js: "accepted_tos", typ: true },
        { json: "for_hire", js: "for_hire", typ: true },
        { json: "social", js: "social", typ: r("Social") },
    ], false),
    "UserLinks": o([
        { json: "self", js: "self", typ: "" },
        { json: "html", js: "html", typ: "" },
        { json: "photos", js: "photos", typ: "" },
        { json: "likes", js: "likes", typ: "" },
        { json: "portfolio", js: "portfolio", typ: "" },
        { json: "following", js: "following", typ: "" },
        { json: "followers", js: "followers", typ: "" },
    ], false),
    "ProfileImage": o([
        { json: "small", js: "small", typ: "" },
        { json: "medium", js: "medium", typ: "" },
        { json: "large", js: "large", typ: "" },
    ], false),
    "Social": o([
        { json: "instagram_username", js: "instagram_username", typ: u(null, "") },
        { json: "portfolio_url", js: "portfolio_url", typ: u(null, "") },
        { json: "twitter_username", js: "twitter_username", typ: u(null, "") },
        { json: "paypal_email", js: "paypal_email", typ: null },
    ], false),
    "AssetType": [
        "photo",
    ],
};
