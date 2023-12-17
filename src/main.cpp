#include "init.hpp"
#include "shader.hpp"
#include "camera.hpp"

int height = 600;
int width = 800;

// Camera parameters
glm::vec3 cameraPos = glm::vec3(0.0f, 0.0f, 0.0f); // Camera position in world space
glm::vec3 Up = glm::vec3(0.0f, 1.0f, 0.0f); // Camera up vector
float Yaw = -90.0f; // Camera yaw
float Pitch = 0.0f; // Camera pitch
bool Perspective = true; // Camera projection type
Camera camera(cameraPos, Yaw, Pitch, Up, Perspective);
double lastX = width / 2.0f;
double lastY = height / 2.0f;
bool firstMouse = true;


// Add glfw screen resize callback
void framebuffer_size_callback(GLFWwindow* window, int w, int h);
void mouse_callback(GLFWwindow* window, double xpos, double ypos);


int main(){
    // Make a quick test to see if init.hpp and init.cpp are working
    GLFWwindow* window = init::setupWindow(height, width);
    ImGuiIO& io = ImGui::GetIO();

    io.ConfigFlags |= ImGuiConfigFlags_NavEnableKeyboard;     // Enable Keyboard Controls

    int display_w, display_h;
    glfwGetFramebufferSize(window, &display_w, &display_h);
    glViewport(0, 0, display_w, display_h);

    glfwSetFramebufferSizeCallback(window, framebuffer_size_callback);
    glfwSetCursorPosCallback(window, mouse_callback);

    // Define a rectangle
    std::vector<float> vertices = {
        // rectangle bottom left triangle
        -1.f, -1.f, 0.0f, // bottom left
        -1.f, 1.f, 0.0f, // top left
        1.f, -1.f, 0.0f, // bottom right

        // rectangle top right triangle
        1.f, -1.f, 0.0f, // bottom right
        -1.f, 1.f, 0.0f, // top left
        1.f, 1.f, 0.0f // top right
    };

    // Generate VAO and VBO for the triangle
    unsigned int VAO, VBO;
    glGenVertexArrays(1, &VAO);
    glGenBuffers(1, &VBO);

    // Bind the VAO and VBO
    glBindVertexArray(VAO);
    glBindBuffer(GL_ARRAY_BUFFER, VBO);

    // Copy the vertices data into the VBO
    glBufferData(GL_ARRAY_BUFFER, vertices.size() * sizeof(float), vertices.data(), GL_STATIC_DRAW);

    // Set the vertex attributes pointers
    glVertexAttribPointer(0, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), (void*)0);
    glEnableVertexAttribArray(0);


    // Add a shader
    Shader program("./shaders/shader.vert", "./shaders/shader.frag");

    glm::vec3 lightPos = glm::vec3(0.0f, 0.0f, 0.0f);
    glm::vec4 lightColor = glm::vec4(1.0f, 0.0f, 1.0f, 1.0f);
    

    // Main loop
    while (!glfwWindowShouldClose(window))
    {
        glfwPollEvents();

        // Process keyboard input
        camera.processKeyboardInput(window);

                // listen for a ctrl event
        if (io.KeyCtrl){
            std::cout << "ctrl pressed" << std::endl;
            //Close the window
            glfwSetWindowShouldClose(window, true);
        }
       
        glfwGetFramebufferSize(window, &display_w, &display_h);
        glViewport(0, 0, display_w, display_h);
        // Make a IMGUI FPS counter
        ImGui_ImplOpenGL3_NewFrame();
        ImGui_ImplGlfw_NewFrame();
        ImGui::NewFrame();
        {
            // Set window size
            ImGui::Begin("FPS");
            ImGui::Text("FPS: %.1f", ImGui::GetIO().Framerate);
            ImGui::SliderFloat3("Light Position", glm::value_ptr(lightPos), -10.0f, 10.0f);
            ImGui::ColorEdit4("Light Color", glm::value_ptr(lightColor));
            ImGui::End();
        }

        glClearColor(0.0f, 0.0f, 0.0f, 1.0f );
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

        
        program.use();
        
        program.setFloat("width", (float) width);
        program.setFloat("height", (float) height);
        program.setFloat("focal_length", 1.0f);
        program.setFloat("time", glfwGetTime());
        program.setVec3("camera_pos", camera.getCameraPos());
        program.setVec3("camera_dir", camera.getCameraPos() + camera.getCameraDir());
        program.setVec3("camera_up", camera.getCameraUp());
        program.setVec3("light_pos", lightPos);
        program.setVec4("light_color", lightColor);



        glBindVertexArray(VAO);
        glDrawArrays(GL_TRIANGLES, 0, vertices.size() / 3);
        ImGui::Render();
        ImGui_ImplOpenGL3_RenderDrawData(ImGui::GetDrawData());

        // std::cout << "looping" << std::endl;

		glfwSwapBuffers(window);
        
    }

    init::cleanup(window);
    return 0;
}

//

void framebuffer_size_callback(GLFWwindow* window, int w, int h)
{
    std::cout << "Resizing window" << std::endl;
    width = w;
    height = h;
    glViewport(0, 0, width, height);
}

// Callback function for mouse movement
void mouse_callback(GLFWwindow* window, double xpos, double ypos){
    if (firstMouse){
        lastX = xpos;
        lastY = ypos;
        firstMouse = false;
    }
    // std::cout << "xpos: " << xpos << " ypos: " << ypos << std::endl;
    float xoffset = xpos - lastX;
    float yoffset = ypos - lastY; // reversed since y-coordinates go from bottom to top
    lastX = xpos;
    lastY = ypos;
    camera.processMouseInput(window, xoffset, yoffset);
}