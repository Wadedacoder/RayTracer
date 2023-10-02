#include "init.hpp"
#include "shader.hpp"

int height = 600;
int width = 800;

// Add glfw screen resize callback
void framebuffer_size_callback(GLFWwindow* window, int w, int h, Shader& program);

int main(){
    // Make a quick test to see if init.hpp and init.cpp are working
    GLFWwindow* window = init::setupWindow(height, width);
    ImGuiIO& io = ImGui::GetIO();

    io.ConfigFlags |= ImGuiConfigFlags_NavEnableKeyboard;     // Enable Keyboard Controls

    int display_w, display_h;
    glfwGetFramebufferSize(window, &display_w, &display_h);
    glViewport(0, 0, display_w, display_h);


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

    glm::vec3 camera_pos = glm::vec3(0.0f, 0.0f, 0.f);
    

    // Main loop
    while (!glfwWindowShouldClose(window))
    {
        glfwPollEvents();
                // listen for a ctrl event
        if (io.KeyCtrl){
            std::cout << "ctrl pressed" << std::endl;
            //Close the window
            glfwSetWindowShouldClose(window, true);
        }
        if(io.KeysDown[GLFW_KEY_W]){
            camera_pos += glm::vec3(0.0f, 0.1f, 0.f);
        }
        if(io.KeysDown[GLFW_KEY_S]){
            camera_pos += glm::vec3(0.0f, -0.1f, -0.f);
        }
        if(io.KeysDown[GLFW_KEY_A]){
            camera_pos += glm::vec3(0.1f, 0.0f, 0.0f);
        }
        if(io.KeysDown[GLFW_KEY_D]){
            camera_pos += glm::vec3(-0.1f, 0.0f, 0.0f);
        }
        if(io.KeysDown[GLFW_KEY_Q]){
            camera_pos += glm::vec3(0.0f, -0.f, 0.1f);
        }
        if(io.KeysDown[GLFW_KEY_E]){
            camera_pos += glm::vec3(0.0f, 0.f, -0.1f);
        }

        // Make a IMGUI FPS counter
        ImGui_ImplOpenGL3_NewFrame();
        ImGui_ImplGlfw_NewFrame();
        ImGui::NewFrame();
        {
            // Set window size
            ImGui::Begin("FPS");
            ImGui::Text("FPS: %.1f", ImGui::GetIO().Framerate);
            ImGui::End();
        }

        glClearColor(0.0f, 0.0f, 0.0f, 1.0f );
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

        
        program.use();
        
        program.setFloat("width", (float) width);
        program.setFloat("height", (float) height);
        program.setFloat("focal_length", 1.0f);
        program.setFloat("time", glfwGetTime());
        program.setVec3("camera_pos", camera_pos);
        program.setVec3("camera_dir", glm::vec3(0.0f, 0.0f, -1.0f));
        program.setVec3("camera_up", glm::vec3(0.0f, 1.0f, 0.0f));


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

void framebuffer_size_callback(GLFWwindow* window, int w, int h, Shader& program)
{
    std::cout << "Resizing window" << std::endl;
    width = w;
    height = h;
    glViewport(0, 0, width, height);
    program.use();
    program.setFloat("width", (float) width);
    program.setFloat("height", (float) height);
}
