// var apiURL = `https://app.asana.com/api/1.0/projects/304439153626197/custom_field_settings`;

var baseApiURL = 'https://app.asana.com/api/1.0/workspaces/20739441009498/tasks/search';

/**
 * Actual demo
 */

var demo = new Vue({

  el: '#app',

  data: {
    client: null,
    workspaceId: 20739441009498,
    sprintBoardProjectId: 1118396450472358,
    sprintBoardBacklogSectionId: 1118396450472394,
    feBoardProjectId: 1119707884067783,
    feBoardBacklogSectionId: 1119707884067790,
    customFieldsIds: {
      'Priority': 304579638329901,
      'UX Impact': 933552981226587,
      'Task Type': 304489422069008,
      'Complexity': 374989979288140,
      'Status': 421457998356288
    },
    customFields: {
        Priority: {
            P0: 3 * 2,
            P1: 2 * 2,
            P2: 1 * 2,
            P3: 1 * 2,
            default: 2 * 2
            // id: 304579638329901,
            // options: {
            //     'P0': 304579638329902,
            //     'P1': 304579638329903,
            //     'P2': 304579638329904
            // }
        },
        'UX Impact': {
            'High': 3 * 3,
            'Medium': 2 * 3,
            'Low': 1 * 3,
            default: 2 * 3
        },
        'Task type': {
            Bug: 3 * 4,
            Improvement: 2 * 4,
            Feature: 1 * 4,
            Operation: 1 * 4,
            default: 2 * 4
        },
        'Complexity': {
            '-A': 3,
            'A': 2,
            'B': 1,
            'C': 1,
            default: 2
        }
    },
    projects: [
      { id: 72329208877935, name: '[T] Manticore', color: '#aa62e3', feSectionId: 546133504730503, points: 4 },
      { id: 304439153626197, name: '[T] Griffin', color: '#fd612c', feSectionId: 316036656769005, points: 1 },
      { id: 395771757519195, name: '[T] Chimera', color: '#e7384f', feSectionId: 756261278646378, points: 3 },
      { id: 704031921542960, name: '[T] Billing', color: '#e362e3', feSectionId: 841106707218224, points: 2 },
      // { id: 72695051296024, name: '[T] Misc', color: '#ea4d9d', feSectionId: null },
      // { id: 608106801285869, name: '[T] Infra', color: '#22aaea', feSectionId: null }
    ],
    searchText: '',
    isLoading: true,
    tasks: null,
    pagination: {
      sortBy: 'points',
      rowsPerPage: -1,
      descending: true
    },
    headers: [
      { text: 'Points', value: 'points' },
      { text: 'Projects', value: 'displayProjects' },
      { text: 'Type', value: 'type' },
      { text: 'Priority', value: 'priority' },
      { text: 'UX Imp.', value: 'ux_impact' },
      { text: 'Compl.', value: 'complexity' },
      { text: 'Name', value: 'name' },
      { text: 'Status', value: 'status' },
      { text: 'Assignee', value: 'assigneeName' },
    ],  
  },

  created: function () {
    this.validateAccessToken();
    this.client = Asana.Client.create().useAccessToken(localStorage.getItem('asana_access_token'));
    // this.client.users.me().then(function(me) {
    //   console.log(me);
    // });
    this.fetchTasks();
    window.setInterval(() => {
      this.fetchTasks();
    }, 3*60*1000);

    window.client = this.client;
  },

  computed: {
    enrichedTasks: function() {
      if (!this.tasks) {
        return []
      };

      return this.tasks.map((task) => {
        task.waiting_days = !task.completed ? moment().diff(task.created_at, 'days') : moment(task.completed_at).diff(task.created_at, 'days');
        task.waiting_days = Math.max(task.waiting_days, 1); // min 1
        task.waiting_days_max = Math.min(task.waiting_days, 21) // max 21
        task.type = this.getCustomFieldSelectedValueName(task, this.customFieldsIds['Task Type']);
        task.typeColor = this.getCustomFieldSelectedValueColor(task, this.customFieldsIds['Task Type']);
        task.priority = this.getCustomFieldSelectedValueName(task, this.customFieldsIds['Priority']);
        task.priorityColor = this.getCustomFieldSelectedValueColor(task, this.customFieldsIds['Priority']);
        task.status = this.getCustomFieldSelectedValueName(task, this.customFieldsIds['Status']);
        task.statusColor = this.getCustomFieldSelectedValueColor(task, this.customFieldsIds['Status']);
        task.complexity = this.getCustomFieldSelectedValueName(task, this.customFieldsIds['Complexity']);
        task.complexityColor = this.getCustomFieldSelectedValueColor(task, this.customFieldsIds['Complexity']);
        task.uxImpact = this.getCustomFieldSelectedValueName(task, this.customFieldsIds['UX Impact']);
        task.uxImpactColor = this.getCustomFieldSelectedValueColor(task, this.customFieldsIds['UX Impact']);
        task.displayProjects = this.getProjects(task);
        task.projectId = this.getProjectId(task);
        task.assigneeName = task.assignee ? task.assignee.name : '';
        task.points = this.getTaskPoints(task);
        return task;
      })
    }
  },

  watch: {
    currentBranch: 'fetchData'
  },

  filters: {
    truncate: function (v) {
      var newline = v.indexOf('\n')
      return newline > 0 ? v.slice(0, newline) : v
    },
    formatDate: function (v) {
      return moment(v).format();
    },
    fromNow: function (v) {
      return moment(v).fromNow();
    },
    initials: function (v) {
      var split = v.split(' ');
      return split.map(word => _.head(_.upperFirst(word))).join('');
    },
  },

  methods: {
    validateAccessToken() {
        if (!localStorage.getItem('asana_access_token')) {
            let token = '';
            while(!token) {
                token = window.prompt('Asasa Assess Token');
            }
            localStorage.setItem('asana_access_token', token);
        }
    },
    fetchTasks() {
      this.client.tasks.search(this.workspaceId, {
          // 'projects.any': this.projects.map((project) => project.id).join(','),
          'sections.any': this.projects.map((project) => project.feSectionId).join(','),
          'completed_on': null,
          'opt_fields': [
              'name','completed','start_on','completed_at','modified_at','created_at','assignee.name','description',
              'custom_fields','projects'
          ].join(','),
          limit: 100
      })
        .then(({ data }) => {
          this.tasks = data;
          this.isLoading = false;

          this.updateTasks();
        });
    },
    updateTasks: async function() {
      for (let i = 0; i < this.enrichedTasks.length; i++) {
        const task = this.enrichedTasks[i];
        
        // Add points to task if points field exist on task
        const customField = _.find(task.custom_fields, { name: 'Points' });
        if (customField && !_.get(customField , 'number_value')) {
          console.log('update task',  task.id, { [customField.id]: task.points });
          await this.client.tasks.update(task.id, { 
            custom_fields: {
              [customField.id]: task.points
            }
          });
        }

        // Set project custom field in task if not aleady added
        const customField2 = _.find(task.custom_fields, { name: 'Project' });
        if (customField2 && !customField2.enum_value) {
          const mainProject = task.displayProjects[0];
          const minProjectName = _.last(_.split(_.get(mainProject, 'name'), ' '));
          const projectOption = _.find(customField2.enum_options, (option) => {
            return option.name === minProjectName;
          });

          if (projectOption) {
            console.log('update task project custom field',  task.id, { 
              custom_fields: {
                [customField2.id]: projectOption.id
              }
            });
            await this.client.tasks.update(task.id, { 
              custom_fields: {
                [customField2.id]: projectOption.id
              }
            });
          }
        }

        // Add task to [T] Sprint board project (section backlog) if it's not already added
        const project = _.find(task.projects, { id: this.sprintBoardProjectId });
        if (!project) {
          console.log('add project to task',  task.id, {
            project: this.sprintBoardProjectId,
            section: this.sprintBoardBacklogSectionId
          });
          await this.client.tasks.addProject(task.id, {
            project: this.sprintBoardProjectId,
            section: this.sprintBoardBacklogSectionId
          });
        }

        // Add task to [T] FE board project (section backlog) if it's not already added
        const project2 = _.find(task.projects, { id: this.feBoardProjectId });
        if (!project2) {
          console.log('add project to task',  task.id, {
            project: this.feBoardProjectId,
            section: this.feBoardBacklogSectionId
          });
          await this.client.tasks.addProject(task.id, {
            project: this.feBoardProjectId,
            section: this.feBoardBacklogSectionId
          });
        }

        // Add task to section Done of project [T] Sprint backlog if it is completed
        // if (task.completed) {
        //   const project = _.find(task.projects, { id: this.sprintBoardProjectId });
        //   if (project && ) {
        //     console.log('add project to task',  task.id, { [customField.id]: task.points });
        //     // await this.client.tasks.addProject(task.id, {
        //     //   project: this.sprintBoardProjectId,
        //     //   section: this.sprintBoardBacklogSectionId
        //     // });
        //   }
        // }
      }
    },
    getTaskPoints(task) {
        let totalPoints = 0;
        task.custom_fields.map((customField) => {
            const value = _.get(customField, 'enum_value.name') || 'default';
            const points = _.get(this.customFields, `${customField.name}.${value}`) || 0;
            totalPoints = totalPoints + points;
        });
        const project = _.find(this.displayProjects, { id: task.projectId });
        totalPoints = totalPoints + (project ? project.points : 0);
        return totalPoints;
    },
    onSearch: _.debounce(function() {
      // this.fetchData();  
    }, 1000),
    getCustomFieldSelectedValueName(task, fieldId) {
        return _.get(_.find(task.custom_fields, { id: fieldId }), 'enum_value.name');
    },
    getCustomFieldSelectedValueColor(task, fieldId) {
        return _.get(_.find(task.custom_fields, { id: fieldId }), 'enum_value.color');
    },
    getProjects: function(task) {
      return task.projects.map(item => {
        return _.find(this.projects, { id: item.id });
      }).filter(item => !!item);
    },
    getProjectId: function(task) {
      var projects = this.getProjects(task);
      return projects.length ? projects[0].id : '';
    }
  }
})
