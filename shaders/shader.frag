#version 330 core

/*
THE BOOK FOLLOWS TOP LEFT AS 00, THIS FOLLOWS BOTTOM LEFT AS 00
*/

out vec4 FragColor;

uniform float time;

// Screen size
uniform float width;
uniform float height;

// Camera
uniform float focal_length;	
uniform vec3 camera_pos;
uniform vec3 camera_dir;
uniform vec3 camera_up;

// A single iteration of Bob Jenkins' One-At-A-Time hashing algorithm.
uint hash( uint x ) {
    x += ( x << 10u );
    x ^= ( x >>  6u );
    x += ( x <<  3u );
    x ^= ( x >> 11u );
    x += ( x << 15u );
    return x;
}


// Code below is from https://stackoverflow.com/questions/4200224/random-noise-functions-for-glsl
// Compound versions of the hashing algorithm I whipped together.
uint hash( uvec2 v ) { return hash( v.x ^ hash(v.y)                         ); }
uint hash( uvec3 v ) { return hash( v.x ^ hash(v.y) ^ hash(v.z)             ); }
uint hash( uvec4 v ) { return hash( v.x ^ hash(v.y) ^ hash(v.z) ^ hash(v.w) ); }



// Construct a float with half-open range [0:1] using low 23 bits.
// All zeroes yields 0.0, all ones yields the next smallest representable value below 1.0.
float floatConstruct( uint m ) {
    const uint ieeeMantissa = 0x007FFFFFu; // binary32 mantissa bitmask
    const uint ieeeOne      = 0x3F800000u; // 1.0 in IEEE binary32

    m &= ieeeMantissa;                     // Keep only mantissa bits (fractional part)
    m |= ieeeOne;                          // Add fractional part to 1.0

    float  f = uintBitsToFloat( m );       // Range [1:2]
    return f - 1.0;                        // Range [0:1]
}



// Pseudo-random value in half-open range [0:1].
float random( float x ) { return floatConstruct(hash(floatBitsToUint(x))); }
float random( vec2  v ) { return floatConstruct(hash(floatBitsToUint(v))); }
float random( vec3  v ) { return floatConstruct(hash(floatBitsToUint(v))); }
float random( vec4  v ) { return floatConstruct(hash(floatBitsToUint(v))); }

struct Interval{
	float min;
	float max;
};

struct Ray
{
	vec3 or; // origin
	vec3 dir; // directionl
};

struct Sphere
{
	vec3 center;
	float radius;
};

struct hit_record
{
	vec3 p;
	vec3 normal;
	float t;
	bool front_face;
};

// Constants and Globals

#define INFINITY 100000.0f
#define PI 3.1415926535897932385f
#define NO_SAMPLES 10

Sphere spheres[2];

Interval empty = Interval(INFINITY, -INFINITY);
Interval universe = Interval(-INFINITY, INFINITY);

vec3 seed;
int random_count = 0;

// Functions

bool contains(Interval i, float t){
	return i.min <= t && t <= i.max;
}

bool surrounds(Interval i, float t){
	return i.min < t && t < i.max;
}


hit_record set_face_normal(hit_record rec, Ray r, vec3 outward_normal){
	rec.front_face = dot(r.dir, outward_normal) < 0;
	rec.normal = rec.front_face ? outward_normal : -outward_normal;
	return rec;
} 

float random_float(){
	random_count++;
	return random(seed + random_count);
}

float random_float(Interval i){
	return i.min + (i.max - i.min)*random_float();
}

vec3 pixel_sample(float u_to_pixel, float v_to_pixel){
	return vec3((random_float() - 0.5f) * u_to_pixel, (random_float() - 0.5f) * v_to_pixel, 0.0f);
}

vec3 at(float t, Ray r)
{
	// P(t) = A + t * B
	return r.or + t * r.dir;
}


bool hit(Sphere S , Ray r, Interval I ,out hit_record rec){
	vec3 center = S.center;
	float radius = S.radius;
	vec3 oc = r.or - center;
	float a = dot(r.dir, r.dir);
	// float b = 2.0f * dot(oc, r.dir);
	float half_b = dot(oc, r.dir);
	float c = dot(oc, oc) - radius * radius;
	float discriminant = half_b * half_b - a * c;

	if(discriminant < 0){
		return false;
	}
	float sqrtd = sqrt(discriminant);
	float root = (-half_b - sqrtd) / a;
	if(!surrounds(I, root)){
		root = (-half_b + sqrtd) / a;
		if(!surrounds(I, root)){
			return false;
		}
	}
	rec.t = root;
	rec.p = at(rec.t, r);
	vec3 outward_normal = (rec.p - center) / radius;
	rec = set_face_normal(rec, r, outward_normal);
	return true;
}

vec4 color_ray(Ray r){
	// float t = hit_sphere(vec3(0.0f, 0.0f, -1.0f), 0.5f, r);
	Sphere S = Sphere(vec3(0.0f, 0.0f, -1.0f), 0.5f);
	hit_record rec;
	Interval ray_max = Interval(0.0f, INFINITY);
	float t_min = 0.0f;
	bool hit_anything = false;
	for(int i = 0; i < 2; i++){
		hit_record tmp_rec;
		if(hit(spheres[i], r, ray_max, tmp_rec)){
			rec = tmp_rec;
			ray_max.max = rec.t;
			hit_anything = true;
		}
	}
	if(hit_anything){
		return vec4(0.5f * (rec.normal.x + 1.0f), 0.5f * (rec.normal.y + 1.0f), 0.5f * (rec.normal.z + 1.0f), 1.0f);
	}
	float t = 0.5f *(1.0f + r.dir.y);
	return vec4(1.0f, 1.0f, 1.0f, 1.0f) * (1.0f - t) + vec4(0.5f, 0.7f, 1.0f, 1.0f) * t;
	// return vec4(r.dir.x, r.dir.y, r.dir.z, 1.0f);
	// return vec4(0.5f * (r.dir.x + 1.0f), 0.5f * (r.dir.y + 1.0f), 0.5f * (r.dir.z + 1.0f), 1.0f);
}


void main()
{	
	seed = vec3(gl_FragCoord.xy, 1.0f);

	//init two spheres adjacent to each other
	spheres[0] = Sphere(vec3(0.0f, 0.0f, -1.0f), 0.5f);
	spheres[1] = Sphere(vec3(0.0f, -100.5f, -1.0f), 100.0f);

	// vec3 pixel_pos = llc + gl_FragCoord.x * (viewport_u / width) + gl_FragCoord.y * (viewport_v / height);
	float aspect_ratio = width / height;
	float viewport_v = 1.0f;
	float viewport_u =  viewport_v * aspect_ratio;
	float u_to_pixel = viewport_u / width;
	float v_to_pixel = viewport_v / height;

	// Converting fragment coords to camera coords st the camera is at (0, 0, 0) and at the center of the screen
	vec3 uvw = gl_FragCoord.xyz; // Current pixel position
	uvw = uvw - camera_pos; // Move camera to origin
	uvw = uvw - focal_length; // Add focal length
	uvw = uvw - vec3(width/2, height/2, 0.0f); // Move to center of screen (0, 0, 0
	vec3 pixel_pos = vec3(uvw.x * u_to_pixel, uvw.y * v_to_pixel, uvw.z); // Scale to viewport
	
	vec3 ray_dir = pixel_pos - camera_pos; // Get ray direction
	Ray r = Ray(camera_pos, normalize(ray_dir));

	// float tmp = random(seed);
	// FragColor = vec4(tmp,tmp,tmp, 1.0f);
	vec4 color = vec4(0.0f, 0.0f, 0.0f, 1.0f);
	for(int i = 0; i < NO_SAMPLES; i++){
		vec3 tmp = pixel_pos + pixel_sample(u_to_pixel, v_to_pixel);
		ray_dir = tmp - camera_pos; // Get ray direction
		r = Ray(camera_pos, normalize(ray_dir));
		color += color_ray(r);
	}
	color /= NO_SAMPLES;
	color = vec4(clamp(color.x, 0.0f, 1.f), clamp(color.y, 0.0f, 1.f), clamp(color.z, 0.0f, 1.f), 1.0f);
	FragColor = color;
	
	// FragColor = vec4(uv.xyy, 1.0f);
	
}