#version 330 core

/*
THE BOOK FOLLOWS TOP LEFT AS 00, THIS FOLLOWS BOTTOM LEFT AS 00
*/

out vec4 FragColor;

// Screen size
uniform float width;
uniform float height;

// Camera
uniform float focal_length;	
uniform vec3 camera_pos;
uniform vec3 camera_dir;
uniform vec3 camera_up;

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
};

Sphere spheres[2];

vec3 at(float t, Ray r)
{
	// P(t) = A + t * B
	return r.or + t * r.dir;
}


bool hit(Sphere S , Ray r, float t_min, float t_max ,out hit_record rec){
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
	if(root < t_min || t_max < root){
		root = (-half_b + sqrtd) / a;
		if(root < t_min || t_max < root){
			return false;
		}
	}
	rec.t = root;
	rec.p = at(rec.t, r);
	rec.normal = (rec.p - center) / radius;
	return true;
}

vec4 color_ray(Ray r){
	// float t = hit_sphere(vec3(0.0f, 0.0f, -1.0f), 0.5f, r);
	Sphere S = Sphere(vec3(0.0f, 0.0f, -1.0f), 0.5f);
	hit_record rec;
	float t_min = 0.0f;
	float closest_so_far = 100000.0f;
	bool hit_anything = false;
	for(int i = 0; i < 2; i++){
		hit_record tmp_rec;
		if(hit(spheres[i], r, t_min, closest_so_far, tmp_rec)){
			rec = tmp_rec;
			closest_so_far = rec.t;
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
	//init two spheres adjacent to each other
	spheres[0] = Sphere(vec3(0.0f, 0.0f, -1.0f), 0.5f);
	spheres[1] = Sphere(vec3(0.0f, -100.5f, -1.0f), 100.0f);

	// vec3 pixel_pos = llc + gl_FragCoord.x * (viewport_u / width) + gl_FragCoord.y * (viewport_v / height);
	float aspect_ratio = width / height;
	float viewport_v = 2.0f;
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

	FragColor = color_ray(r);
	// FragColor = vec4(uv.xyy, 1.0f);
	
}