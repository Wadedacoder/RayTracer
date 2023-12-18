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

float vfov = 90.0f;

// Lighting
uniform vec3 light_pos;
uniform vec3 light_color;

// Random number generator

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

struct Material
{
	vec3 albedo;
	float fuzz;

	// Phong
	float ka;
	float kd;
	float ks;
	float eta;

	vec3 ambient;
	vec3 diffuse;
	vec3 specular;
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
	Material mat;
};

struct hit_record
{
	vec3 p;
	vec3 normal;
	float t;
	bool front_face;
	Material mat;
};

// Constants and Globals

#define INFINITY 100000.0f
#define PI 3.1415926535897932385f
#define NO_SAMPLES 1

Sphere spheres[2];

Interval empty = Interval(INFINITY, -INFINITY);
Interval universe = Interval(-INFINITY, INFINITY);

Material groundMat = Material(
	vec3(0.8f, 0.8f, 0.0f), // albedo
	0.0f, // fuzz
	0.1f, // ka
	0.9f, // kd
	0.0f, // ks
	1.0f, // eta
	vec3(0.1f, 0.4f, 0.1f), // ambient
	vec3(0.1f, 1.f, 0.1f), // diffuse
	vec3(0.8f, 0.8f, 0.8f) // specular
);

Material redMat = Material(
	vec3(0.8f, 0.0f, 0.0f), // albedo
	0.0f, // fuzz
	0.1f, // ka
	0.9f, // kd
	0.1f, // ks
	32.0f, // eta
	vec3(0.1f, 0.1f, 0.1f), // ambient
	vec3(0.8f, 0.0f, 0.0f), // diffuse
	vec3(0.8f, 0.8f, 0.8f) // specular
);

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
	rec.mat = S.mat;
	return true;
}

vec4 shade(vec3 p, vec3 normal, Material mat){
	vec3 light_dir = normalize(light_pos - p);
	vec3 view_dir = normalize(camera_pos - p);
	vec3 half_dir = normalize(light_dir + view_dir);
	float diffuse = max(dot(normal, light_dir), 0.0f);
	float specular = pow(max(dot(normal, half_dir), 0.0f), mat.eta);
	vec3 ambient = mat.ambient;
	vec3 diffuse_color = mat.diffuse * diffuse;
	vec3 specular_color = mat.specular * specular;
	vec3 color = ambient + diffuse_color + specular_color;
	return vec4(color, 1.0f);

}

vec4 color_ray(Ray r){
	// float t = hit_sphere(vec3(0.0f, 0.0f, -1.0f), 0.5f, r);
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
		// return vec4(0.5f * (rec.normal.x + 1.0f), 0.5f * (rec.normal.y + 1.0f), 0.5f * (rec.normal.z + 1.0f), 1.0f);
		return shade(rec.p, rec.normal, rec.mat);
	}
	float t = 0.5f *(1.0f + r.dir.y);
	return vec4(1.0f, 1.0f, 1.0f, 1.0f) * (1.0f - t) + vec4(0.5f, 0.7f, 1.0f, 1.0f) * t;
	// return vec4(r.dir.x, r.dir.y, r.dir.z, 1.0f);
	// return vec4(0.5f * (r.dir.x + 1.0f), 0.5f * (r.dir.y + 1.0f), 0.5f * (r.dir.z + 1.0f), 1.0f);
}


void main()
{	
	// Calculate seed
	seed = vec3(gl_FragCoord.xy, 1.0f);


	//init two spheres adjacent to each other
	spheres[0] = Sphere(vec3(0.0f, 0.0f, -1.0f), 0.5f, redMat);
	spheres[1] = Sphere(vec3(0.0f, -100.5f, -1.0f), 100.0f, groundMat);

	// vec3 pixel_pos = llc + gl_FragCoord.x * (viewport_u / width) + gl_FragCoord.y * (viewport_v / height);
	float aspect_ratio = width / height;

	// calculate u, v, w for camera
	vec3 w = normalize(camera_pos - camera_dir);
	vec3 u = normalize(cross(camera_up, w));
	vec3 v = cross(w, u);

	// calculate viewport
	float focal_length = length(camera_pos - camera_dir);
	float h = tan(radians(vfov) / 2.0f);
	float viewport_h = 2.0f * focal_length * h;
	float viewport_w = aspect_ratio * viewport_h;

	// calculate viewport origin
	vec3 viewport_origin = camera_pos - u * (viewport_w / 2.0f) - v * (viewport_h / 2.0f) - w * focal_length;

	// calculate pixel position
	float u_to_pixel = viewport_w / width;
	float v_to_pixel = viewport_h / height;
	vec3 pixel_pos = viewport_origin + gl_FragCoord.x * u_to_pixel * u + gl_FragCoord.y * v_to_pixel * v; 
	
	vec3 ray_dir = pixel_pos - camera_pos; // Get ray direction
	Ray r = Ray(camera_pos, normalize(ray_dir));

	// float tmp = random(seed);
	// FragColor = vec4(tmp,tmp,tmp, 1.0f);
	vec4 color = vec4(0.0f, 0.0f, 0.0f, 1.0f);
	int no_sa = NO_SAMPLES;

	vec4 color1 = vec4(0.0f, 0.0f, 0.0f, 1.0f);
	vec3 ray = pixel_pos + pixel_sample(u_to_pixel, v_to_pixel) - camera_pos;
	r = Ray(camera_pos, normalize(ray));
	color1 += color_ray(r);

	vec4 color2 = vec4(0.0f, 0.0f, 0.0f, 1.0f);
	ray = pixel_pos + pixel_sample(u_to_pixel, v_to_pixel) - camera_pos;
	r = Ray(camera_pos, normalize(ray));
	color2 += color_ray(r);
	if(color1 == color2){
		no_sa = 1;
	}
	for(int i = 0; i < no_sa; i++){
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